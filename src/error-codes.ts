/** Machine-readable error codes emitted during validation. */
export const ErrorCode = {
  REQUIRED: 'REQUIRED',
  NOT_ALLOWED: 'NOT_ALLOWED',
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  MIN_VIOLATION: 'MIN_VIOLATION',
  MAX_VIOLATION: 'MAX_VIOLATION',
  PATTERN_MISMATCH: 'PATTERN_MISMATCH',
  INVALID_FORMAT: 'INVALID_FORMAT',
  VALUE_NOT_IN_LIST: 'VALUE_NOT_IN_LIST',
  ARRAY_ELEMENT_NOT_IN_LIST: 'ARRAY_ELEMENT_NOT_IN_LIST',
  CHILDREN_TYPE_ERROR: 'CHILDREN_TYPE_ERROR',
  MIN_MAX_NOT_APPLICABLE: 'MIN_MAX_NOT_APPLICABLE',
  IN_NOT_APPLICABLE: 'IN_NOT_APPLICABLE',
} as const

/** Union of all possible error code string literals. */
export type ODVErrorCode = typeof ErrorCode[keyof typeof ErrorCode]

/**
 * Custom message formatter function.
 * Receives an error code and contextual parameters, returns a human-readable message string.
 */
export type ODVMessageFormatter = (code: ODVErrorCode, params: Record<string, unknown>) => string

export const DEFAULT_MESSAGES: Record<ODVErrorCode, (params: Record<string, unknown>) => string> = {
  REQUIRED: () => 'Parameter required',
  NOT_ALLOWED: () => 'Parameter not allowed',
  TYPE_MISMATCH: (p) => `Incorrect type: ${p.expected} required, ${p.actual} provided`,
  MIN_VIOLATION: (p) => `Minimal value (length) is ${p.min}. ${p.actual} provided`,
  MAX_VIOLATION: (p) => `Maximal value (length) is ${p.max}. ${p.actual} provided`,
  PATTERN_MISMATCH: () => 'Incorrect string format',
  INVALID_FORMAT: (p) => `Incorrect ${p.format}`,
  VALUE_NOT_IN_LIST: (p) => 'Provided value is not allowed' + (p.allowed ? `. Allowed values are: "${(p.allowed as unknown[]).join('", "')}"` : ''),
  ARRAY_ELEMENT_NOT_IN_LIST: (p) => 'Some of provided values in array are not allowed' + (p.allowed ? `. Allowed values are: "${(p.allowed as unknown[]).join('", "')}"` : ''),
  CHILDREN_TYPE_ERROR: (p) => `Can't validate children of type ${p.actual}`,
  MIN_MAX_NOT_APPLICABLE: (p) => `${p.actual} can not be validated for "min" and "max"`,
  IN_NOT_APPLICABLE: () => '"in" directive is not applicable for objects',
}
