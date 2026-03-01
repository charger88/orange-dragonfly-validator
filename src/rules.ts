import type { ODValidatorRulesSchema, ODValidatorRuleSchema } from './types'
import { ODValidatorException } from './exceptions'
import { ODValidatorRule } from './rule'
import { ODValidator } from './validator'
import { RULES_SCHEMA, RULES_OPTIONS_SCHEMA } from './schemas'
import { deepCloneSchema } from './clone'
import { isSafeKey } from './sanitize'

/** Meta-keys that are not field names (mirrors META_KEYS in validator.ts). */
const SCHEMA_META_KEYS = new Set(['@', '#', '*'])

/** Recursively checks whether any rule in a schema tree declares a transform or default. */
function schemaHasTransformOrDefault(schema: ODValidatorRulesSchema): boolean {
  for (const key of Object.keys(schema)) {
    if (key === '@') continue
    const rule = schema[key] as ODValidatorRuleSchema
    if (!rule || typeof rule !== 'object') continue
    if (rule.default !== undefined || rule.transform !== undefined) return true
    if (rule.children && schemaHasTransformOrDefault(rule.children)) return true
    if (rule.per_type) {
      for (const typeKey of Object.keys(rule.per_type)) {
        const perTypeRule = rule.per_type[typeKey]
        if (!perTypeRule || typeof perTypeRule !== 'object') continue
        if (perTypeRule.transform !== undefined) return true  // per_type has no 'default'
        if (perTypeRule.children && schemaHasTransformOrDefault(perTypeRule.children)) return true
      }
    }
  }
  return false
}

/** Recursively populates a WeakMap from schema objects to their precomputed key data and strict-mode override. */
function buildSchemaKeyCache(
  schema: ODValidatorRulesSchema,
  cache: WeakMap<ODValidatorRulesSchema, { keys: string[]; keySet: Set<string>; strictOverride: boolean | null }>,
): void {
  // Filter meta-keys and poisoned keys at build time so the hot loop needs no per-call checks
  const keys = Object.keys(schema).filter(k => !SCHEMA_META_KEYS.has(k) && isSafeKey(k))
  // Precompute schema-level strict override so enforceStrictMode avoids @.strict lookups each call
  const atOption = schema['@'] as Record<string, unknown> | undefined
  const strictOverride: boolean | null = atOption !== undefined && 'strict' in atOption ? atOption.strict as boolean : null
  cache.set(schema, { keys, keySet: new Set(keys), strictOverride })
  for (const key of Object.keys(schema)) {
    if (key === '@') continue
    const rule = schema[key] as ODValidatorRuleSchema
    if (!rule || typeof rule !== 'object') continue
    if (rule.children) buildSchemaKeyCache(rule.children, cache)
    if (rule.per_type) {
      for (const typeKey of Object.keys(rule.per_type)) {
        const perTypeRule = rule.per_type[typeKey]
        if (perTypeRule?.children) buildSchemaKeyCache(perTypeRule.children, cache)
      }
    }
  }
}

function normalizeRule(rule: ODValidatorRuleSchema): void {
  if (rule && typeof rule === 'object') {
    if ('type' in rule) {
      rule.type = rule.type ? (typeof rule.type !== 'object' ? [rule.type] : rule.type) : null
      if (rule.type) {
        if ((rule.type as string[]).includes('number') && !(rule.type as string[]).includes('integer')) {
          (rule.type as string[]).push('integer')
        }
      }
    }
    if (rule.per_type) {
      for (const typeKey of Object.keys(rule.per_type)) {
        normalizeRule(rule.per_type[typeKey] as ODValidatorRuleSchema)
      }
    }
    if (rule.children) {
      normalizeSchema(rule.children)
    }
  }
}

function normalizeSchema(schema: ODValidatorRulesSchema): void {
  for (const key of Object.keys(schema)) {
    if (key === '@') continue
    normalizeRule(schema[key] as ODValidatorRuleSchema)
  }
}

function validateSchemaNode(
  rules: ODValidatorRulesSchema,
  optionsValidator: ODValidator,
  rulesValidator: ODValidator,
): void {
  const clonedRules: Record<string, unknown> = { ...rules }
  if ('#' in clonedRules) {
    clonedRules['>>>#'] = clonedRules['#']
    delete clonedRules['#']
  }
  if ('*' in clonedRules) {
    clonedRules['>>>*'] = clonedRules['*']
    delete clonedRules['*']
  }
  if ('@' in clonedRules) {
    try {
      optionsValidator.validate(clonedRules['@'] as Record<string, unknown>)
    } catch (e) {
      ODValidatorRule.validationRulesError('Validation rules options are incorrect', (e as ODValidatorException).details)
    }
    delete clonedRules['@']
  }
  try {
    rulesValidator.validate(clonedRules as Record<string, unknown>)
  } catch (e) {
    ODValidatorRule.validationRulesError('Validation rules are incorrect', (e as ODValidatorException).details)
  }

  for (const key of Object.keys(rules)) {
    if (key === '@') continue
    const rule = rules[key] as ODValidatorRuleSchema
    if (!rule || typeof rule !== 'object') continue
    if (rule.children) {
      validateSchemaNode(rule.children, optionsValidator, rulesValidator)
    }
    if (rule.per_type) {
      for (const typeKey of Object.keys(rule.per_type)) {
        const perTypeRule = rule.per_type[typeKey]
        if (perTypeRule?.children) {
          validateSchemaNode(perTypeRule.children, optionsValidator, rulesValidator)
        }
      }
    }
  }
}

/**
 * Wraps a rules schema and provides static utilities for schema validation and normalization.
 */
export class ODValidatorRules<S extends ODValidatorRulesSchema = ODValidatorRulesSchema> {
  readonly schema: S
  /** @internal Pre-normalized schema, computed once at construction time. */
  readonly normalizedSchema: ODValidatorRulesSchema
  /** @internal True when any rule in the schema tree declares a transform or default. Used to skip input cloning. */
  private readonly _hasTransformOrDefault: boolean
  /** @internal Maps each schema object (including nested children) to its precomputed key list, set, and strict-mode override. */
  readonly _schemaKeyCache: WeakMap<ODValidatorRulesSchema, { keys: string[]; keySet: Set<string>; strictOverride: boolean | null }>
  private _validated = false

  /** Whether this schema has already been validated. */
  get isValidated(): boolean {
    return this._validated
  }

  /** @internal True when any rule in the schema tree declares a transform or default. Used to skip input cloning. */
  get hasTransformOrDefault() {
    return this._hasTransformOrDefault
  }

  /** @internal Mark this schema as validated. Used by ODValidator. */
  markValidated(): void {
    this._validated = true
  }

  constructor(schema: S) {
    this.schema = schema
    this.normalizedSchema = ODValidatorRules.normalize(schema)
    this._hasTransformOrDefault = schemaHasTransformOrDefault(this.normalizedSchema)
    this._schemaKeyCache = new WeakMap()
    buildSchemaKeyCache(this.normalizedSchema, this._schemaKeyCache)
  }

  /**
   * Validates that a rules schema is well-formed (correct types, known options, etc.).
   * @throws {ODValidatorRulesException} If the schema is invalid.
   */
  static validate(rules: ODValidatorRulesSchema): void {
    const optionsValidator = ODValidator.createInternal(
      new ODValidatorRules(RULES_OPTIONS_SCHEMA as ODValidatorRulesSchema),
      { strictMode: true },
    )
    const rulesValidator = ODValidator.createInternal(
      new ODValidatorRules(RULES_SCHEMA as ODValidatorRulesSchema),
      { strictMode: false },
    )
    validateSchemaNode(rules, optionsValidator, rulesValidator)
  }

  /**
   * Returns a deep-cloned, normalized copy of the schema.
   * Normalization converts single-type strings to arrays and adds `"integer"` when `"number"` is present.
   */
  static normalize(rules: ODValidatorRulesSchema): ODValidatorRulesSchema {
    const cloned = deepCloneSchema(rules)
    normalizeSchema(cloned)
    return cloned
  }
}
