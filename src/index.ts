import type { ODValidatorRulesSchema, ODValidatorValidateOptions, ODValidatorOptions, ODValidatorRuleSchema, ODValidatorPerTypeRuleSchema, ODValidatorRulesOptions, ODValidatorValueType, ODValidatorErrors, ODValidatorErrorEntry } from './types'
import type { ODValidatorErrorCode, ODValidatorMessageFormatter } from './error-codes'
import type { ODValidatorInfer } from './infer'
import type { SafeParseResult } from './parse'
import type { JsonSchema, FromJsonSchemaResult } from './json-schema'
import { ODValidatorException, ODValidatorRulesException, ODValidatorSecurityException } from './exceptions'
import { ODValidator } from './validator'
import { ODValidatorRules } from './rules'
import { ODValidatorRule } from './rule'
import { ErrorCode } from './error-codes'
import { EMAIL_PATTERN, PHONE_PATTERN, US_PHONE_PATTERN, URL_PATTERN, UUID_PATTERN, IPV4_PATTERN, DATE_PATTERN, DATETIME_PATTERN, HEX_COLOR_PATTERN, SPECIAL_VALIDATORS, SPECIAL_MAX_LENGTHS } from './special-validators'
import { isSafeKey } from './sanitize'
import { parse, safeParse, validateSchema } from './parse'
import { fromJsonSchema, toJsonSchema } from './json-schema'
import { ODValidatorSchemaBuilder, ODValidatorPropertyBuilder } from './builder'
import { createValidator } from './create-validator'

/** @deprecated Use {@link parse} or {@link safeParse} instead. */
export {
  createValidator,
  parse,
  safeParse,
  validateSchema,
  fromJsonSchema,
  toJsonSchema,
  ODValidator,
  ODValidatorRules,
  ODValidatorRule,
  ODValidatorException,
  ODValidatorRulesException,
  ODValidatorSecurityException,
  ODValidatorSchemaBuilder,
  ODValidatorPropertyBuilder,
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
  ODValidatorRulesSchema,
  ODValidatorValidateOptions,
  ODValidatorOptions,
  ODValidatorRuleSchema,
  ODValidatorPerTypeRuleSchema,
  ODValidatorRulesOptions,
  ODValidatorValueType,
  ODValidatorErrors,
  ODValidatorErrorEntry,
  ODValidatorErrorCode,
  ODValidatorMessageFormatter,
  ODValidatorInfer,
  SafeParseResult,
  JsonSchema,
  FromJsonSchemaResult,
}
