import type { ODValidatorRulesSchema, ODValidatorErrors, ODValidatorOptions } from './types'
import type { ODValidatorInfer } from './infer'
import { ODValidator } from './validator'
import { ODValidatorRules } from './rules'
import { ODValidatorException, ODValidatorRulesException } from './exceptions'

/**
 * Parses and validates input against a schema, returning strongly-typed data.
 * Accepts either a plain schema object or an {@link ODValidatorRules} instance.
 * Always throws on validation failure.
 * @throws {ODValidatorException} If the input fails validation.
 * @throws {ODValidatorRulesException} If the schema itself is invalid.
 */
export function parse<const S extends ODValidatorRulesSchema>(
  schema: S | ODValidatorRules<S>,
  input: Record<string, unknown>,
  options?: Omit<ODValidatorOptions, 'exceptionMode'>,
  errorsPrefix?: string,
): ODValidatorInfer<S> {
  const validatorRules = schema instanceof ODValidatorRules ? schema : new ODValidatorRules(schema)
  const constructorOptions: ODValidatorOptions = options ? {...options} : {}
  const validator = new ODValidator(validatorRules, constructorOptions)
  validator.validate(input, errorsPrefix ?? '')
  return validator.data as ODValidatorInfer<S>
}

/** Result of {@link safeParse}: either a success with typed data, or a failure with errors. */
export type SafeParseResult<S extends ODValidatorRulesSchema> =
  | { success: true; data: ODValidatorInfer<S> }
  | { success: false; errors: ODValidatorErrors }

/**
 * Like {@link parse}, but returns a discriminated union instead of throwing.
 * Accepts either a plain schema object or an {@link ODValidatorRules} instance.
 * Schema errors (invalid rules) are still thrown.
 */
export function safeParse<const S extends ODValidatorRulesSchema>(
  schema: S | ODValidatorRules<S>,
  input: Record<string, unknown>,
  options?: Omit<ODValidatorOptions, 'exceptionMode'>,
  errorsPrefix?: string,
): SafeParseResult<S> {
  try {
    const data = parse(schema, input, options, errorsPrefix)
    return { success: true, data }
  } catch (e) {
    if (e instanceof ODValidatorRulesException) {
      throw e
    }
    if (e instanceof ODValidatorException) {
      return { success: false, errors: e.details }
    }
    throw e
  }
}

/**
 * Validates that a plain object is a well-formed ODValidator rules schema (including nested children).
 * @returns The input cast to {@link ODValidatorRulesSchema}.
 * @throws {ODValidatorRulesException} If the schema is invalid.
 */
export function validateSchema(json: Record<string, unknown>): ODValidatorRulesSchema {
  ODValidatorRules.validate(json as ODValidatorRulesSchema)
  return json as ODValidatorRulesSchema
}
