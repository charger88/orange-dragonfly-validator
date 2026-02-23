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
