import type { ODValidatorErrors } from './types'

/**
 * Thrown when input data fails validation.
 * Contains structured error details accessible via {@link details} and a simplified {@link info} view.
 */
export class ODValidatorException extends Error {
  private _details: ODValidatorErrors

  constructor(message: string, details: ODValidatorErrors = {}) {
    super(message)
    this.name = 'ODValidatorException'
    this._details = details
  }

  /** Structured validation errors keyed by field name. */
  get details(): ODValidatorErrors {
    return this._details
  }

  set details(value: ODValidatorErrors) {
    this._details = value
  }

  /** Simplified error view: field names mapped to arrays of human-readable messages. */
  get info(): Record<string, string[]> {
    const result: Record<string, string[]> = {}
    for (const key of Object.keys(this._details)) {
      result[key] = this._details[key].map(e => e.message)
    }
    return result
  }
}

/**
 * Thrown when the schema itself is invalid (e.g. unsupported type, conflicting rules).
 * This indicates a programming error in the schema definition, not invalid user input.
 */
export class ODValidatorRulesException extends ODValidatorException {
  constructor(message: string, details: ODValidatorErrors = {}) {
    super(message, details)
    this.name = 'ODValidatorRulesException'
  }
}

/**
 * Thrown when validation input or schema contains a poisoned key that could be
 * used for prototype pollution.
 */
export class ODValidatorSecurityException extends Error {
  readonly source: 'input' | 'schema'
  readonly key: string
  readonly path: string

  constructor(source: 'input' | 'schema', key: string, path: string) {
    super(`Unsafe key "${key}" is not allowed in ${source} at "${path}"`)
    this.name = 'ODValidatorSecurityException'
    this.source = source
    this.key = key
    this.path = path
  }
}
