import type { ODValidatorRulesSchema, ODValidatorRuleSchema, ODValidatorOptions, ODValidatorErrors } from './types'
import type { ODValidatorErrorCode, ODValidatorMessageFormatter } from './error-codes'
import type { JsonSchema } from './json-schema'
import { ErrorCode, DEFAULT_MESSAGES } from './error-codes'
import { ODValidatorException } from './exceptions'
import { ODValidatorRule } from './rule'
import { ODValidatorRules } from './rules'
import { fromJsonSchema } from './json-schema'
import { isSafeKey } from './sanitize'

const META_KEYS = new Set(['@', '#', '*'])

/**
 * The fastest way to say if object has any keys
 * @param obj 
 * @returns 
 */
function hasKeys(obj: object): boolean {
  for (const _ in obj) return true
  return false
}

interface ResolvedOptions {
  strictMode: boolean
  exceptionMode: boolean
  internalCall: boolean
  messageFormatter?: ODValidatorMessageFormatter
}

const DEFAULT_OPTIONS: ResolvedOptions = {
  strictMode: true,
  exceptionMode: true,
  internalCall: false,
}

/**
 * Core validator class. Accepts a rules schema and validates input objects against it.
 *
 * @example
 * ```ts
 * const rules = new ODValidatorRules({ name: { type: 'string', required: true } })
 * const validator = new ODValidator(rules)
 * validator.validate({ name: 'Alice' }) // true
 * validator.data // { name: 'Alice' }
 * ```
 */
export class ODValidator {
  readonly rules: ODValidatorRules
  private _options: ResolvedOptions
  /** Validation errors from the last {@link validate} call, keyed by field name. */
  errors: ODValidatorErrors
  private _processedData: Record<string, unknown> | unknown[] | null = null
  private readonly _boundProcessChildren: (rules: ODValidatorRulesSchema, input: Record<string, unknown>, prefix: string) => void

  /**
   * @param rules - Pre-constructed {@link ODValidatorRules} instance containing the validation schema.
   * @param options - Optional configuration (strict mode, exception mode, message formatter).
   */
  constructor(rules: ODValidatorRules, options: ODValidatorOptions = {}) {
    this.rules = rules
    this._options = { ...DEFAULT_OPTIONS, ...options }
    this.errors = {}
    this._boundProcessChildren = this._processChildren.bind(this)
  }

  /**
   * Creates a validator from a JSON Schema object.
   *
   * @param jsonSchema - A JSON Schema (draft-07 / 2020-12) object to convert.
   * @param options - Optional validator configuration.
   * @returns The validator instance and any conversion warnings.
   */
  static fromJsonSchema(jsonSchema: JsonSchema, options: ODValidatorOptions = {}): { validator: ODValidator, warnings: string[] } {
    const { schema, warnings } = fromJsonSchema(jsonSchema)
    const validator = new ODValidator(new ODValidatorRules(schema), options)
    return { validator, warnings }
  }

  /** @internal Used by the library itself to skip rules validation and input cloning. */
  static createInternal(rules: ODValidatorRules, options: Omit<ODValidatorOptions, 'internalCall'>): ODValidator {
    const instance = new ODValidator(rules, options)
    instance._options.internalCall = true
    return instance
  }

  /** Whether strict mode is enabled (rejects undeclared keys). */
  get strictMode(): boolean {
    return this._options.strictMode
  }

  set strictMode(value: boolean) {
    this._options.strictMode = value
  }

  /** Whether exception mode is enabled (throws on validation failure). */
  get exceptionMode(): boolean {
    return this._options.exceptionMode
  }

  set exceptionMode(value: boolean) {
    this._options.exceptionMode = value
  }

  /** The processed/validated data from the last {@link validate} call, or `null` if not yet validated. */
  get data(): Record<string, unknown> | unknown[] | null {
    return this._processedData
  }

  private addError(
    errKey: string,
    code: ODValidatorErrorCode,
    params: Record<string, unknown>,
  ): void {
    if (!Object.hasOwn(this.errors, errKey)) {
      this.errors[errKey] = []
    }
    const messageFormatter = this._options.messageFormatter
    const message = messageFormatter
      ? messageFormatter(code, params)
      : DEFAULT_MESSAGES[code](params)
    this.errors[errKey].push({ code, message, params })
  }

  private processWildcards(
    workingRules: ODValidatorRulesSchema,
    data: Record<string, unknown> | unknown[],
    errorsPrefix: string,
    processChildren: (rules: ODValidatorRulesSchema, input: Record<string, unknown>, prefix: string) => void,
  ): void {
    const messageFormatter = this._options.messageFormatter
    const hashRule = workingRules['#'] as ODValidatorRuleSchema | undefined
    const starRule = workingRules['*'] as ODValidatorRuleSchema | undefined
    if (!hashRule && !starRule) return
    const isArray = Array.isArray(data)
    const keys = Object.keys(data)
    for (let i = 0; i < keys.length; i++) {
      const dataKey = keys[i]
      if (!isArray && !isSafeKey(dataKey)) continue
      const errKeyPrefix = errorsPrefix + dataKey
      if (hashRule) {
        ODValidatorRule.applyRule(hashRule, dataKey, errKeyPrefix + '#key', this.errors, processChildren, messageFormatter)
      }
      if (starRule) {
        const idx = isArray ? i : undefined
        const currentValue = idx !== undefined ? (data as unknown[])[idx] : (data as Record<string, unknown>)[dataKey]
        const processedValue = ODValidatorRule.applyRule(starRule, currentValue, errKeyPrefix, this.errors, processChildren, messageFormatter)
        if (starRule.apply_transformed) {
          if (idx !== undefined) {
            (data as unknown[])[idx] = processedValue
          } else {
            (data as Record<string, unknown>)[dataKey] = processedValue
          }
        }
      }
    }
  }

  private enforceStrictMode(
    workingRules: ODValidatorRulesSchema,
    data: Record<string, unknown>,
    errorsPrefix: string,
  ): void {
    const cached = this.rules._schemaKeyCache.get(workingRules)
    // Use precomputed strictOverride when available; fall back to per-call @.strict lookup for ad-hoc schemas
    const isStrictMode = cached !== undefined
      ? (cached.strictOverride ?? this._options.strictMode)
      : workingRules['@'] !== undefined && (workingRules['@'] as Record<string, unknown>).strict !== undefined
        ? (workingRules['@'] as Record<string, unknown>).strict as boolean
        : this._options.strictMode
    // Note: "*" (wildcard) validates every existing key's value but does NOT
    // implicitly allow keys. In strict mode, only explicitly named keys are
    // allowed. Use "@": { "strict": false } if wildcard-only schemas are needed.
    if (isStrictMode) {
      const definedKeys = cached
        ? cached.keySet
        : new Set(Object.keys(workingRules).filter(k => !META_KEYS.has(k)))
      for (const key in data) {
        if (Object.hasOwn(data, key) && !definedKeys.has(key)) {
          this.addError(errorsPrefix + key, ErrorCode.NOT_ALLOWED, {})
        }
      }
    }
  }

  private processNamedRules(
    workingRules: ODValidatorRulesSchema,
    data: Record<string, unknown>,
    errorsPrefix: string,
    processChildren: (rules: ODValidatorRulesSchema, input: Record<string, unknown>, prefix: string) => void,
  ): void {
    const messageFormatter = this._options.messageFormatter
    const cached = this.rules._schemaKeyCache.get(workingRules)
    if (cached) {
      for (const key of cached.keys) {
        // isSafeKey already filtered at cache-build time — no per-call check needed
        const ruleSchema = workingRules[key] as ODValidatorRuleSchema
        if (ruleSchema.default !== undefined && !Object.hasOwn(data, key)) data[key] = ruleSchema.default
        if (Object.hasOwn(data, key)) {
          const processedValue = ODValidatorRule.applyRule(ruleSchema, data[key], errorsPrefix + key, this.errors, processChildren, messageFormatter)
          if (ruleSchema.apply_transformed) {
            data[key] = processedValue
          }
        } else if (ruleSchema.required) {
          this.addError(errorsPrefix + key, ErrorCode.REQUIRED, {})
        }
      }
    } else {
      // Fallback for rules not in the cache (e.g. from process() with ad-hoc schemas)
      for (const key of Object.keys(workingRules)) {
        if (key === '@' || key === '#' || key === '*') continue
        const ruleSchema = workingRules[key] as ODValidatorRuleSchema
        if (!isSafeKey(key)) continue
        if (ruleSchema.default !== undefined && !Object.hasOwn(data, key)) data[key] = ruleSchema.default
        if (Object.hasOwn(data, key)) {
          const processedValue = ODValidatorRule.applyRule(ruleSchema, data[key], errorsPrefix + key, this.errors, processChildren, messageFormatter)
          if (ruleSchema.apply_transformed) {
            data[key] = processedValue
          }
        } else if (ruleSchema.required) {
          this.addError(errorsPrefix + key, ErrorCode.REQUIRED, {})
        }
      }
    }
  }

  private _processChildren(childRules: ODValidatorRulesSchema, childInput: Record<string, unknown>, prefix: string): void {
    const childData = this.processRules(childRules, childInput, prefix)
    Object.assign(childInput, childData)
  }

  /** @internal Core processing logic. Operates on already-normalized rules, no cloning. */
  private processRules(rules: ODValidatorRulesSchema, input: Record<string, unknown> | unknown[], errorsPrefix: string): Record<string, unknown> | unknown[] {
    this.processWildcards(rules, input, errorsPrefix, this._boundProcessChildren)
    if (!Array.isArray(input)) {
      this.enforceStrictMode(rules, input as Record<string, unknown>, errorsPrefix)
      this.processNamedRules(rules, input as Record<string, unknown>, errorsPrefix, this._boundProcessChildren)
    }
    return input
  }

  /**
   * Processes input against a rules schema, collecting errors. Called internally by {@link validate}.
   *
   * @param rules - The raw rules schema (will be normalized and validated).
   * @param input - The input data to validate.
   * @param errorsPrefix - Optional prefix prepended to error keys (useful for nested validation).
   * @returns A shallow copy of the input with defaults applied and transforms executed.
   */
  process(rules: ODValidatorRulesSchema, input: Record<string, unknown>, errorsPrefix = ''): Record<string, unknown> | unknown[] {
    const workingRules = ODValidatorRules.normalize(rules)
    if (!this._options.internalCall) {
      ODValidatorRules.validate(workingRules)
    }
    const data = this._options.internalCall ? input : (Array.isArray(input) ? [...input] : { ...input })
    return this.processRules(workingRules, data, errorsPrefix)
  }

  /**
   * Validates input data against the rules schema.
   * Resets errors and data from any previous call.
   *
   * @param input - The input data to validate.
   * @param errorsPrefix - Optional prefix prepended to error keys (useful for nested validation).
   * @returns `true` if valid, `false` if invalid (when exception mode is off).
   * @throws {ODValidatorException} If invalid and exception mode is on.
   */
  validate(input: Record<string, unknown>, errorsPrefix = ''): boolean {
    this.errors = {}
    this._processedData = null
    if (!this._options.internalCall && !this.rules.isValidated) {
      ODValidatorRules.validate(this.rules.normalizedSchema)
      this.rules.markValidated()
    }
    const data = this._options.internalCall || !this.rules.hasTransformOrDefault
      ? input
      : Array.isArray(input) ? [...input] : { ...input }
    this._processedData = this.processRules(this.rules.normalizedSchema, data, errorsPrefix)
    if (!hasKeys(this.errors)) return true
    if (this._options.exceptionMode) {
      throw new ODValidatorException('Validation failed', this.errors)
    }
    return false
  }
}
