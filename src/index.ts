import type { ODVRulesSchema, ODVValidateOptions, ODVOptions, ODVRuleSchema, ODVPerTypeRuleSchema, ODVRulesOptions, ODVValueType, ODVErrors, ODVErrorEntry } from './types'
import type { ODVErrorCode, ODVMessageFormatter } from './error-codes'
import type { ODVInfer } from './infer'
import type { SafeParseResult } from './parse'
import type { JsonSchema, FromJsonSchemaResult } from './json-schema'
import { ODVException, ODVRulesException } from './exceptions'
import { ODVValidator } from './validator'
import { ODVRules } from './rules'
import { ODVRule } from './rule'
import { ErrorCode } from './error-codes'
import { EMAIL_PATTERN, PHONE_PATTERN, US_PHONE_PATTERN, URL_PATTERN, UUID_PATTERN, IPV4_PATTERN, DATE_PATTERN, DATETIME_PATTERN, HEX_COLOR_PATTERN, SPECIAL_VALIDATORS, SPECIAL_MAX_LENGTHS } from './special-validators'
import { isSafeKey } from './sanitize'
import validate from './validate'
import { parse, safeParse, validateSchema } from './parse'
import { fromJsonSchema, toJsonSchema } from './json-schema'
import { ODVSchemaBuilder, ODVPropertyBuilder } from './builder'

/** @deprecated Use {@link parse} or {@link safeParse} instead. */
export default validate
export {
  validate,
  parse,
  safeParse,
  validateSchema,
  fromJsonSchema,
  toJsonSchema,
  ODVValidator,
  ODVRules,
  ODVRule,
  ODVException,
  ODVRulesException,
  ODVSchemaBuilder,
  ODVPropertyBuilder,
  ErrorCode,
  EMAIL_PATTERN,
  PHONE_PATTERN,
  US_PHONE_PATTERN,
  URL_PATTERN,
  UUID_PATTERN,
  IPV4_PATTERN,
  DATE_PATTERN,
  DATETIME_PATTERN,
  HEX_COLOR_PATTERN,
  SPECIAL_VALIDATORS,
  SPECIAL_MAX_LENGTHS,
  isSafeKey,
}
export type {
  ODVRulesSchema,
  ODVValidateOptions,
  ODVOptions,
  ODVRuleSchema,
  ODVPerTypeRuleSchema,
  ODVRulesOptions,
  ODVValueType,
  ODVErrors,
  ODVErrorEntry,
  ODVErrorCode,
  ODVMessageFormatter,
  ODVInfer,
  SafeParseResult,
  JsonSchema,
  FromJsonSchemaResult,
}
