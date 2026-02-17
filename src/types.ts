import type { ODVErrorCode, ODVMessageFormatter } from './error-codes'

/** Recognized value types for validation rules. */
export type ODVValueType = 'string' | 'number' | 'integer' | 'array' | 'object' | 'boolean' | 'function' | 'null'

/**
 * Type-specific rule overrides applied via the `per_type` field.
 * All properties here can also appear at the top level of a rule.
 */
export interface ODVPerTypeRuleSchema {
  /** Allowed values list. Rejects value (or array elements) not in this list. */
  in?: readonly unknown[]
  /** Controls which values are exposed in error messages. `true` echoes `in`, an array overrides it. */
  'in:public'?: readonly unknown[] | boolean
  /** Minimum value, length, or item count depending on type. */
  min?: number
  /** Maximum value, length, or item count depending on type. */
  max?: number
  /** Regular expression (or string pattern) the value must match. Applies to strings only. */
  pattern?: RegExp | string
  /** Built-in format validator name (e.g. `"email"`, `"url"`, `"uuid"`, `"phone"`). */
  special?: string
  /** Transform function applied to the value before validation. */
  transform?: (value: unknown) => unknown
  /** When `true`, the transformed value replaces the original in the output data. */
  apply_transformed?: boolean
  /** Nested schema for validating object properties or array elements. */
  children?: ODVRulesSchema
}

/**
 * Schema definition for a single validation rule.
 * Extends {@link ODVPerTypeRuleSchema} with type, required, default, and per-type overrides.
 */
export interface ODVRuleSchema extends ODVPerTypeRuleSchema {
  /** Expected value type(s). A single type, an array of types, or `null` to skip type checking. */
  type?: ODVValueType | readonly ODVValueType[] | null
  /** When `true`, the field must be present in the input. */
  required?: boolean
  /** Default value used when the field is missing from the input. */
  default?: unknown
  /** Type-specific rule overrides. Keys are type names, values are partial rule schemas. */
  per_type?: Record<string, ODVPerTypeRuleSchema>
}

/** Options stored under the `@` meta-key in a rules schema. */
export interface ODVRulesOptions {
  /** When `true`, rejects any input keys not explicitly defined in the schema. */
  strict?: boolean
}

/**
 * Top-level schema object mapping field names to validation rules.
 *
 * Special meta-keys:
 * - `@` — schema-level options (e.g. strict mode)
 * - `#` — key name validator (validates property names themselves)
 * - `*` — wildcard rule applied to every value in the input
 *
 * **Limitations**: ODV schemas validate each field independently. There is no
 * built-in support for cross-field dependencies (e.g. "if field A is present,
 * field B is required"), union schemas (`oneOf`/`anyOf`), or conditional logic
 * (`if`/`then`/`else`). For these cases, use the `transform` callback to
 * implement custom logic, or validate in multiple passes with different schemas.
 */
export interface ODVRulesSchema {
  '@'?: ODVRulesOptions
  '#'?: ODVRuleSchema
  '*'?: ODVRuleSchema
  [key: string]: ODVRuleSchema | ODVRulesOptions | undefined
}

/** Options for the {@link ODVValidator} constructor. */
export interface ODVOptions {
  /** Enable strict mode — reject keys not defined in the schema. Defaults to `true`. */
  strictMode?: boolean
  /** When `true`, throw on validation failure instead of returning `false`. Defaults to `true`. */
  exceptionMode?: boolean
  /** Custom function for formatting error messages. */
  messageFormatter?: ODVMessageFormatter
}

/** Options for the standalone {@link validate} function. */
export interface ODVValidateOptions {
  /** Enable strict mode — reject keys not defined in the schema. */
  strict?: boolean
  /** When `true`, throw on validation failure instead of returning `false`. */
  exception?: boolean
  /** Prefix prepended to error keys (useful for nested validation). */
  errorsPrefix?: string
  /** @deprecated Alias for prefix prepended to error keys. */
  errors_prefix?: string
  /** Custom function for formatting error messages. */
  messages?: ODVMessageFormatter
}

/** A single validation error with its code, human-readable message, and contextual parameters. */
export interface ODVErrorEntry {
  /** Machine-readable error code (e.g. `"REQUIRED"`, `"TYPE_MISMATCH"`). */
  code: ODVErrorCode
  /** Human-readable error message. */
  message: string
  /** Contextual parameters for the error (e.g. `{ min: 5, actual: 2 }`). */
  params?: Record<string, unknown>
}

/** Map of field names to their validation error entries. */
export type ODVErrors = Record<string, ODVErrorEntry[]>
