import type { ODValidatorRulesSchema, ODValidatorRuleSchema } from './types'
import { ODValidatorException } from './exceptions'
import { ODValidatorRule } from './rule'
import { ODValidator } from './validator'
import { RULES_SCHEMA, RULES_OPTIONS_SCHEMA } from './schemas'
import { deepCloneSchema } from './clone'

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

/**
 * Wraps a rules schema and provides static utilities for schema validation and normalization.
 */
export class ODValidatorRules<S extends ODValidatorRulesSchema = ODValidatorRulesSchema> {
  readonly schema: S
  /** @internal Pre-normalized schema, computed once at construction time. */
  readonly normalizedSchema: ODValidatorRulesSchema
  private _validated = false

  /** Whether this schema has already been validated. */
  get isValidated(): boolean {
    return this._validated
  }

  /** @internal Mark this schema as validated. Used by ODValidator. */
  markValidated(): void {
    this._validated = true
  }

  constructor(schema: S) {
    this.schema = schema
    this.normalizedSchema = ODValidatorRules.normalize(schema)
  }

  /**
   * Validates that a rules schema is well-formed (correct types, known options, etc.).
   * @throws {ODValidatorRulesException} If the schema is invalid.
   */
  static validate(rules: ODValidatorRulesSchema): void {
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
        const validatorRules = new ODValidatorRules(RULES_OPTIONS_SCHEMA as ODValidatorRulesSchema)
        const validator = ODValidator.createInternal(validatorRules, { strictMode: true })
        validator.validate(clonedRules['@'] as Record<string, unknown>)
      } catch (e) {
        ODValidatorRule.validationRulesError('Validation rules options are incorrect', (e as ODValidatorException).details)
      }
      delete clonedRules['@']
    }
    try {
      const validatorRules = new ODValidatorRules(RULES_SCHEMA as ODValidatorRulesSchema)
      const validator = ODValidator.createInternal(validatorRules, { strictMode: false })
      validator.validate(clonedRules as Record<string, unknown>)
    } catch (e) {
      ODValidatorRule.validationRulesError('Validation rules are incorrect', (e as ODValidatorException).details)
    }
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
