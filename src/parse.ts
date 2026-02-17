import type { ODVRulesSchema, ODVErrors, ODVOptions } from './types'
import type { ODVInfer } from './infer'
import { ODVValidator } from './validator'
import { ODVRules } from './rules'
import { ODVException, ODVRulesException } from './exceptions'

/**
 * Parses and validates input against a schema, returning strongly-typed data.
 * Accepts either a plain schema object or an {@link ODVRules} instance.
 * Always throws on validation failure.
 * @throws {ODVException} If the input fails validation.
 * @throws {ODVRulesException} If the schema itself is invalid.
 */
export function parse<const S extends ODVRulesSchema>(
  schema: S | ODVRules<S>,
  input: Record<string, unknown>,
  options?: Omit<ODVOptions, 'exceptionMode'>,
  errorsPrefix?: string,
): ODVInfer<S> {
  const validatorRules = schema instanceof ODVRules ? schema : new ODVRules(schema)
  const constructorOptions: ODVOptions = options ? {...options} : {}
  const validator = new ODVValidator(validatorRules, constructorOptions)
  validator.validate(input, errorsPrefix ?? '')
  return validator.data as ODVInfer<S>
}

/** Result of {@link safeParse}: either a success with typed data, or a failure with errors. */
export type SafeParseResult<S extends ODVRulesSchema> =
  | { success: true; data: ODVInfer<S> }
  | { success: false; errors: ODVErrors }

/**
 * Like {@link parse}, but returns a discriminated union instead of throwing.
 * Accepts either a plain schema object or an {@link ODVRules} instance.
 * Schema errors (invalid rules) are still thrown.
 */
export function safeParse<const S extends ODVRulesSchema>(
  schema: S | ODVRules<S>,
  input: Record<string, unknown>,
  options?: Omit<ODVOptions, 'exceptionMode'>,
  errorsPrefix?: string,
): SafeParseResult<S> {
  try {
    const data = parse(schema, input, options, errorsPrefix)
    return { success: true, data }
  } catch (e) {
    if (e instanceof ODVRulesException) {
      throw e
    }
    if (e instanceof ODVException) {
      return { success: false, errors: e.details }
    }
    throw e
  }
}

/**
 * Validates that a plain object is a well-formed ODV rules schema (including nested children).
 * @returns The input cast to {@link ODVRulesSchema}.
 * @throws {ODVRulesException} If the schema is invalid.
 */
export function validateSchema(json: Record<string, unknown>): ODVRulesSchema {
  validateSchemaRecursive(json as ODVRulesSchema)
  return json as ODVRulesSchema
}

function validateSchemaRecursive(schema: ODVRulesSchema): void {
  ODVRules.validate(schema)
  for (const key of Object.keys(schema)) {
    if (key === '@') continue
    const rule = schema[key] as Record<string, unknown> | undefined
    if (rule && typeof rule === 'object' && rule.children !== undefined && typeof rule.children === 'object') {
      validateSchemaRecursive(rule.children as ODVRulesSchema)
    }
  }
}
