import type { ODVRulesSchema, ODVValidateOptions, ODVOptions } from './types'
import { ODVValidator } from './validator'
import { ODVRules } from './rules'

/**
 * Standalone validation function. Creates a one-off validator and runs it.
 *
 * @deprecated This function is provided for backward compatibility only.
 * It returns `Record<string, unknown> | false`, which offers no type inference
 * and uses a boolean-return pattern that is error-prone in TypeScript.
 *
 * Use {@link parse} or {@link safeParse} instead for type-safe validation:
 *
 * @example
 * ```ts
 * import { parse, safeParse } from 'orange-dragonfly-validator'
 *
 * // parse() — throws on failure, returns strongly typed data
 * const user = parse({
 *   name: { type: 'string', required: true },
 *   age: { type: 'integer', min: 0 },
 * } as const, input)
 * // user is { name: string; age?: number }
 *
 * // safeParse() — never throws on validation errors, returns a discriminated union
 * const result = safeParse({
 *   name: { type: 'string', required: true },
 * } as const, input)
 * if (result.success) {
 *   console.log(result.data.name)
 * } else {
 *   console.log(result.errors)
 * }
 * ```
 *
 * @returns The validated data object on success, or `false` on failure (unless exception mode is on).
 */
const validate = function(rules: ODVRulesSchema, input: Record<string, unknown>, options: ODVValidateOptions = {}): Record<string, unknown> | unknown[] | false {
  const validatorRules = new ODVRules(rules)
  const constructorOptions: ODVOptions = {}
  if (options.strict !== undefined) constructorOptions.strictMode = options.strict
  if (options.exception !== undefined) constructorOptions.exceptionMode = options.exception
  if (options.messages !== undefined) constructorOptions.messageFormatter = options.messages
  const validator = new ODVValidator(validatorRules, constructorOptions)
  const result = validator.validate(input, options?.errorsPrefix ?? options.errors_prefix ?? '')
  if (result === false) return false
  return validator.data!
}

export default validate
export { validate }
