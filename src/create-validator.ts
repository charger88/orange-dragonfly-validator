import type { ODValidatorRulesSchema, ODValidatorOptions } from './types'
import { ODValidatorRules } from './rules'
import { ODValidator } from './validator'

/**
 * Creates a reusable {@link ODValidator} from a schema and options.
 *
 * This is the **recommended** way to use the library when validating the same
 * schema more than once. `ODValidatorRules` normalises and deep-clones the
 * schema once at construction time, so subsequent `validate()` calls pay no
 * per-call setup cost.
 *
 * @example
 * ```ts
 * import { createValidator } from 'orange-dragonfly-validator'
 *
 * const validator = createValidator({
 *   name: { type: 'string', required: true, min: 1, max: 100 },
 *   age:  { type: 'integer', min: 0, max: 150 },
 * } as const)
 *
 * // Reuse across many requests:
 * validator.validate(req.body)
 * console.log(validator.data)
 * ```
 *
 * @param schema  - The validation schema.
 * @param options - Optional {@link ODValidatorOptions} (strict mode, exception mode, message formatter).
 * @returns A ready-to-use {@link ODValidator} instance.
 */
export function createValidator(schema: ODValidatorRulesSchema, options: ODValidatorOptions = {}): ODValidator {
  const rules = new ODValidatorRules(schema)
  return new ODValidator(rules, options)
}
