import type { ODValidatorRuleSchema, ODValidatorPerTypeRuleSchema, ODValidatorValueType, ODValidatorRulesSchema, ODValidatorErrors } from './types'
import type { ODValidatorErrorCode, ODValidatorMessageFormatter } from './error-codes'
import { ErrorCode, DEFAULT_MESSAGES } from './error-codes'
import { ODValidatorRulesException } from './exceptions'
import { SPECIAL_VALIDATORS, SPECIAL_MAX_LENGTHS } from './special-validators'
import { deepCloneRuleDef } from './clone'

const patternCache = new Map<string, RegExp>()

function throwRulesError(errMsg: string, info: ODValidatorErrors): never {
  throw new ODValidatorRulesException(`${errMsg}. See "info" parameter of exception for the details`, info)
}

/** Returns the ODValidator value type for a given value, or `null` for non-finite numbers. */
function getValueType(value: unknown): ODValidatorValueType | null {
  const t = typeof value
  if (t === 'object') {
    if (Array.isArray(value)) return 'array'
    if (value === null) return 'null'
    return 'object'
  }
  if (t === 'number') {
    if (!Number.isFinite(value as number)) return null
    if (Number.isInteger(value)) return 'integer'
    return 'number'
  }
  return t as ODValidatorValueType
}

/** Returns the numeric value used for min/max comparison: length for strings/arrays, the value itself for numbers. */
function getValueForMinOrMax(value: unknown, valueType: ODValidatorValueType): number | null {
  if (valueType === 'array') return (value as unknown[]).length
  if (valueType === 'string') return (value as string).length
  if (valueType === 'number' || valueType === 'integer') return value as number
  return null
}

function addErrorToMap(
  errors: ODValidatorErrors,
  errorsKey: string,
  code: ODValidatorErrorCode,
  messageFormatter: ODValidatorMessageFormatter | undefined,
  params: Record<string, unknown> = {},
): void {
  if (!Object.hasOwn(errors, errorsKey)) {
    errors[errorsKey] = []
  }
  const message = messageFormatter ? messageFormatter(code, params) : DEFAULT_MESSAGES[code](params)
  errors[errorsKey].push({ code, message, params })
}

function getPerTypeRule(
  def: ODValidatorRuleSchema,
  valueType: ODValidatorValueType | null,
): ODValidatorPerTypeRuleSchema | undefined {
  if (valueType === null || def.per_type === undefined || !Object.hasOwn(def.per_type, valueType)) {
    return undefined
  }
  return def.per_type[valueType]
}

function checkMinMax(
  value: unknown,
  valueType: ODValidatorValueType,
  min: number | undefined,
  max: number | undefined,
  def: ODValidatorRuleSchema,
  errorsKey: string,
  errors: ODValidatorErrors,
  messageFormatter: ODValidatorMessageFormatter | undefined,
): void {
  const minMaxValue = getValueForMinOrMax(value, valueType)
  if (minMaxValue !== null) {
    if (min !== undefined && (minMaxValue < min)) addErrorToMap(errors, errorsKey, ErrorCode.MIN_VIOLATION, messageFormatter, { min, actual: minMaxValue })
    if (max !== undefined && (minMaxValue > max)) addErrorToMap(errors, errorsKey, ErrorCode.MAX_VIOLATION, messageFormatter, { max, actual: minMaxValue })
  } else if (def.type === undefined || def.type === null || (def.type as string[]).length < 2) {
    const info: ODValidatorErrors = {}
    info[errorsKey] = [{ code: ErrorCode.MIN_MAX_NOT_APPLICABLE, message: `${valueType} can not be validated for "min" and "max"`, params: { actual: valueType } }]
    throwRulesError('Validation rules are incorrect', info)
  }
}

function checkInList(
  value: unknown,
  valueType: ODValidatorValueType,
  inList: readonly unknown[],
  inPublic: readonly unknown[] | boolean | undefined,
  errorsKey: string,
  errors: ODValidatorErrors,
  messageFormatter: ODValidatorMessageFormatter | undefined,
): void {
  if (valueType === 'object') {
    const info: ODValidatorErrors = {}
    info[errorsKey] = [{ code: ErrorCode.IN_NOT_APPLICABLE, message: '"in" directive is not applicable for objects', params: {} }]
    throwRulesError('Validation rules are incorrect', info)
  } else if (valueType === 'array') {
    if ((value as unknown[]).filter(v => !inList.includes(v)).length) {
      const allowed = inPublic ? (inPublic === true ? [...inList] : [...(inPublic as unknown[])]) : undefined
      addErrorToMap(errors, errorsKey, ErrorCode.ARRAY_ELEMENT_NOT_IN_LIST, messageFormatter, { allowed })
    }
  } else {
    if (!inList.includes(value)) {
      const allowed = inPublic ? (inPublic === true ? [...inList] : [...(inPublic as unknown[])]) : undefined
      addErrorToMap(errors, errorsKey, ErrorCode.VALUE_NOT_IN_LIST, messageFormatter, { allowed })
    }
  }
}

function checkPattern(
  value: unknown,
  valueType: ODValidatorValueType,
  pattern: RegExp | string | undefined,
  special: string | undefined,
  errorsKey: string,
  errors: ODValidatorErrors,
  messageFormatter: ODValidatorMessageFormatter | undefined,
): void {
  if (valueType !== 'string') {
    addErrorToMap(errors, errorsKey, ErrorCode.PATTERN_MISMATCH, messageFormatter)
    return
  }
  const str = value as string
  if (special !== undefined) {
    const maxLen = SPECIAL_MAX_LENGTHS[special]
    if (maxLen !== undefined && str.length > maxLen) {
      addErrorToMap(errors, errorsKey, ErrorCode.INVALID_FORMAT, messageFormatter, { format: special })
    } else {
      const specialPattern = SPECIAL_VALIDATORS[special]
      if (specialPattern) {
        if (!specialPattern.test(str)) addErrorToMap(errors, errorsKey, ErrorCode.INVALID_FORMAT, messageFormatter, { format: special })
      }
    }
  }
  if (pattern !== undefined) {
    let expression: RegExp
    if (typeof pattern === 'string') {
      let cached = patternCache.get(pattern)
      if (!cached) {
        cached = new RegExp(pattern)
        patternCache.set(pattern, cached)
      }
      expression = cached
    } else {
      expression = pattern
    }
    if (!expression.test(str)) addErrorToMap(errors, errorsKey, ErrorCode.PATTERN_MISMATCH, messageFormatter)
  }
}

function checkChildren(
  value: unknown,
  valueType: ODValidatorValueType,
  children: ODValidatorRulesSchema,
  def: ODValidatorRuleSchema,
  errorsKey: string,
  processChildren: (rules: ODValidatorRulesSchema, input: Record<string, unknown>, prefix: string) => void,
): void {
  if ((valueType === 'object') || (valueType === 'array')) {
    processChildren(children, value as Record<string, unknown>, `${errorsKey}.`)
  } else {
    if (def.type === undefined || !(def.type as string[]).filter(t => !['object', 'array'].includes(t)).length) {
      const info: ODValidatorErrors = {}
      info[errorsKey] = [{ code: ErrorCode.CHILDREN_TYPE_ERROR, message: `Can't validate children of type ${valueType}`, params: { actual: valueType } }]
      throwRulesError('Validation rules are incorrect', info)
    }
  }
}

/**
 * Represents a single validation rule. Handles type checking, min/max enforcement,
 * pattern matching, `in` list validation, special format validation, and children delegation.
 */
export class ODValidatorRule {
  readonly definition: ODValidatorRuleSchema

  /** Creates a new rule instance, deep-cloning the definition to ensure immutability. */
  constructor(definition: ODValidatorRuleSchema) {
    this.definition = deepCloneRuleDef(definition)
  }

  /** Throws an {@link ODValidatorRulesException} indicating the schema itself is invalid. */
  static validationRulesError(errMsg: string, info: ODValidatorErrors): never {
    return throwRulesError(errMsg, info)
  }

  /**
   * Applies a rule definition to a value, populating `errors` for any violations.
   * Resolves `per_type` overrides inline without mutating the rule definition.
   *
   * @param def - The rule schema to apply.
   * @param originalValue - The raw input value (before any transform).
   * @param errorsKey - The dot-delimited key under which errors are recorded.
   * @param errors - Mutable error map that collects all validation failures.
   * @param processChildren - Callback to recurse into nested children schemas.
   * @param messageFormatter - Optional custom message formatter.
   * @param runtimeState - Internal metadata about whether transformed output should be stored.
   * @returns The (possibly transformed) value.
   */
  static applyRule(
    def: ODValidatorRuleSchema,
    originalValue: unknown,
    errorsKey: string,
    errors: ODValidatorErrors,
    processChildren: (rules: ODValidatorRulesSchema, input: Record<string, unknown>, prefix: string) => void,
    messageFormatter?: ODValidatorMessageFormatter,
    runtimeState?: { applyTransformed: boolean },
  ): unknown {
    const baseValue = def.transform !== undefined ? def.transform(originalValue) : originalValue
    const prePerTypeRule = getPerTypeRule(def, getValueType(baseValue))
    const value = prePerTypeRule?.transform !== undefined ? prePerTypeRule.transform(baseValue) : baseValue
    if (runtimeState) {
      runtimeState.applyTransformed = (
        prePerTypeRule?.transform !== undefined
          ? (prePerTypeRule.apply_transformed ?? def.apply_transformed)
          : def.apply_transformed
      ) === true
    }

    const valueType = getValueType(value)

    if (valueType === null) {
      if (def.type !== undefined && def.type !== null) {
        addErrorToMap(errors, errorsKey, ErrorCode.TYPE_MISMATCH, messageFormatter, { expected: (def.type as string[]).join(' or '), actual: 'NaN/Infinity' })
      }
      return value
    }

    if (def.type !== undefined && def.type !== null && !(def.type as string[]).includes(valueType)) {
      addErrorToMap(errors, errorsKey, ErrorCode.TYPE_MISMATCH, messageFormatter, { expected: (def.type as string[]).join(' or '), actual: valueType })
      return value
    }

    const perType = getPerTypeRule(def, valueType)
    const min = perType?.min ?? def.min
    const max = perType?.max ?? def.max
    const inList = perType?.in ?? def.in
    const inPublic = perType?.['in:public'] ?? def['in:public']
    const pattern = perType?.pattern ?? def.pattern
    const special = perType?.special ?? def.special
    const children = perType?.children ?? def.children

    if (value !== null) {
      if (min !== undefined || max !== undefined) {
        checkMinMax(value, valueType, min, max, def, errorsKey, errors, messageFormatter)
      }
      if (inList !== undefined) {
        checkInList(value, valueType, inList, inPublic, errorsKey, errors, messageFormatter)
      }
      if (pattern !== undefined || special !== undefined) {
        checkPattern(value, valueType, pattern, special, errorsKey, errors, messageFormatter)
      }
      if (children !== undefined) {
        checkChildren(value, valueType, children, def, errorsKey, processChildren)
      }
    }
    return value
  }
}
