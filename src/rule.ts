import type { ODVRuleSchema, ODVPerTypeRuleSchema, ODVValueType, ODVRulesSchema, ODVErrors } from './types'
import type { ODVErrorCode, ODVMessageFormatter } from './error-codes'
import { ErrorCode, DEFAULT_MESSAGES } from './error-codes'
import { ODVRulesException } from './exceptions'
import { SPECIAL_VALIDATORS, SPECIAL_MAX_LENGTHS } from './special-validators'
import { deepCloneRuleDef } from './clone'

const patternCache = new Map<string, RegExp>()

type AddErrorFn = (code: ODVErrorCode, params?: Record<string, unknown>) => void

function throwRulesError(errMsg: string, info: ODVErrors): never {
  throw new ODVRulesException(`${errMsg}. See "info" parameter of exception for the details`, info)
}

/** Returns the ODV value type for a given value, or `null` for non-finite numbers. */
function getValueType(value: unknown): ODVValueType | null {
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
  return t as ODVValueType
}

/** Returns the numeric value used for min/max comparison: length for strings/arrays, the value itself for numbers. */
function getValueForMinOrMax(value: unknown, valueType: ODVValueType): number | null {
  if (valueType === 'array') return (value as unknown[]).length
  if (valueType === 'string') return (value as string).length
  if (valueType === 'number' || valueType === 'integer') return value as number
  return null
}

function checkMinMax(
  value: unknown,
  valueType: ODVValueType,
  min: number | undefined,
  max: number | undefined,
  def: ODVRuleSchema,
  errorsKey: string,
  addError: AddErrorFn,
): void {
  const minMaxValue = getValueForMinOrMax(value, valueType)
  if (minMaxValue !== null) {
    if (min !== undefined && (minMaxValue < min)) addError(ErrorCode.MIN_VIOLATION, { min, actual: minMaxValue })
    if (max !== undefined && (minMaxValue > max)) addError(ErrorCode.MAX_VIOLATION, { max, actual: minMaxValue })
  } else if (def.type === undefined || def.type === null || (def.type as string[]).length < 2) {
    const info: ODVErrors = {}
    info[errorsKey] = [{ code: ErrorCode.MIN_MAX_NOT_APPLICABLE, message: `${valueType} can not be validated for "min" and "max"`, params: { actual: valueType } }]
    throwRulesError('Validation rules are incorrect', info)
  }
}

function checkInList(
  value: unknown,
  valueType: ODVValueType,
  inList: readonly unknown[],
  inPublic: readonly unknown[] | boolean | undefined,
  errorsKey: string,
  addError: AddErrorFn,
): void {
  if (valueType === 'object') {
    const info: ODVErrors = {}
    info[errorsKey] = [{ code: ErrorCode.IN_NOT_APPLICABLE, message: '"in" directive is not applicable for objects', params: {} }]
    throwRulesError('Validation rules are incorrect', info)
  } else if (valueType === 'array') {
    if ((value as unknown[]).filter(v => !inList.includes(v)).length) {
      const allowed = inPublic ? (inPublic === true ? [...inList] : [...(inPublic as unknown[])]) : undefined
      addError(ErrorCode.ARRAY_ELEMENT_NOT_IN_LIST, { allowed })
    }
  } else {
    if (!inList.includes(value)) {
      const allowed = inPublic ? (inPublic === true ? [...inList] : [...(inPublic as unknown[])]) : undefined
      addError(ErrorCode.VALUE_NOT_IN_LIST, { allowed })
    }
  }
}

function checkPattern(
  value: unknown,
  valueType: ODVValueType,
  pattern: RegExp | string | undefined,
  special: string | undefined,
  addError: AddErrorFn,
): void {
  if (valueType !== 'string') {
    addError(ErrorCode.PATTERN_MISMATCH)
    return
  }
  const str = value as string
  if (special !== undefined) {
    const maxLen = SPECIAL_MAX_LENGTHS[special]
    if (maxLen !== undefined && str.length > maxLen) {
      addError(ErrorCode.INVALID_FORMAT, { format: special })
    } else {
      const specialPattern = SPECIAL_VALIDATORS[special]
      if (specialPattern) {
        if (!specialPattern.test(str)) addError(ErrorCode.INVALID_FORMAT, { format: special })
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
    if (!expression.test(str)) addError(ErrorCode.PATTERN_MISMATCH)
  }
}

function checkChildren(
  value: unknown,
  valueType: ODVValueType,
  children: ODVRulesSchema,
  def: ODVRuleSchema,
  errorsKey: string,
  processChildren: (rules: ODVRulesSchema, input: Record<string, unknown>, prefix: string) => void,
): void {
  if ((valueType === 'object') || (valueType === 'array')) {
    processChildren(children, value as Record<string, unknown>, `${errorsKey}.`)
  } else {
    if (def.type === undefined || !(def.type as string[]).filter(t => !['object', 'array'].includes(t)).length) {
      const info: ODVErrors = {}
      info[errorsKey] = [{ code: ErrorCode.CHILDREN_TYPE_ERROR, message: `Can't validate children of type ${valueType}`, params: { actual: valueType } }]
      throwRulesError('Validation rules are incorrect', info)
    }
  }
}

/**
 * Represents a single validation rule. Handles type checking, min/max enforcement,
 * pattern matching, `in` list validation, special format validation, and children delegation.
 */
export class ODVRule {
  readonly definition: ODVRuleSchema

  /** Creates a new rule instance, deep-cloning the definition to ensure immutability. */
  constructor(definition: ODVRuleSchema) {
    this.definition = deepCloneRuleDef(definition)
  }

  /** Throws an {@link ODVRulesException} indicating the schema itself is invalid. */
  static validationRulesError(errMsg: string, info: ODVErrors): never {
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
   * @returns The (possibly transformed) value.
   */
  static applyRule(
    def: ODVRuleSchema,
    originalValue: unknown,
    errorsKey: string,
    errors: ODVErrors,
    processChildren: (rules: ODVRulesSchema, input: Record<string, unknown>, prefix: string) => void,
    messageFormatter?: ODVMessageFormatter,
  ): unknown {
    const addError: AddErrorFn = (code, params = {}) => {
      const message = messageFormatter
        ? messageFormatter(code, params)
        : DEFAULT_MESSAGES[code](params)
      if (!Object.hasOwn(errors, errorsKey)) {
        errors[errorsKey] = []
      }
      errors[errorsKey].push({ code, message, params })
    }

    const value = def.transform !== undefined ? def.transform(originalValue) : originalValue
    const valueType = getValueType(value)

    if (valueType === null) {
      if (def.type !== undefined && def.type !== null) {
        addError(ErrorCode.TYPE_MISMATCH, { expected: (def.type as string[]).join(' or '), actual: 'NaN/Infinity' })
      }
      return value
    }

    if (def.type !== undefined && def.type !== null && !(def.type as string[]).includes(valueType)) {
      addError(ErrorCode.TYPE_MISMATCH, { expected: (def.type as string[]).join(' or '), actual: valueType })
      return value
    }

    // Resolve per_type overrides without mutation — read from overlay first, then base def
    const perType: ODVPerTypeRuleSchema | undefined = def.per_type !== undefined && Object.hasOwn(def.per_type, valueType) ? def.per_type[valueType] : undefined
    const min = perType?.min ?? def.min
    const max = perType?.max ?? def.max
    const inList = perType?.in ?? def.in
    const inPublic = perType?.['in:public'] ?? def['in:public']
    const pattern = perType?.pattern ?? def.pattern
    const special = perType?.special ?? def.special
    const children = perType?.children ?? def.children

    if (value !== null) {
      if (min !== undefined || max !== undefined) {
        checkMinMax(value, valueType, min, max, def, errorsKey, addError)
      }
      if (inList !== undefined) {
        checkInList(value, valueType, inList, inPublic, errorsKey, addError)
      }
      if (pattern !== undefined || special !== undefined) {
        checkPattern(value, valueType, pattern, special, addError)
      }
      if (children !== undefined) {
        checkChildren(value, valueType, children, def, errorsKey, processChildren)
      }
    }
    return value
  }
}
