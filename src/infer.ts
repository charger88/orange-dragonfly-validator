import type { ODVRulesSchema, ODVRuleSchema } from './types'

// Map a single type string literal to its TypeScript type
type MapSingleType<T extends string> =
  T extends 'string' ? string :
  T extends 'number' ? number :
  T extends 'integer' ? number :
  T extends 'boolean' ? boolean :
  T extends 'null' ? null :
  T extends 'array' ? unknown[] :
  T extends 'object' ? Record<string, unknown> :
  T extends 'function' ? ((...args: unknown[]) => unknown) :
  unknown

// Map a type field (single string or readonly array of strings) to TS union
type MapType<T> =
  T extends readonly (infer U)[]
    ? U extends string ? MapSingleType<U> : never
    : T extends string
      ? MapSingleType<T>
      : unknown

// Narrow via `in` constraint when used with `as const`
type NarrowIn<InValues, BaseType> =
  InValues extends readonly (infer U)[]
    ? Extract<U, BaseType> extends never ? BaseType : Extract<U, BaseType>
    : BaseType

// Infer a full schema (object-level) from children
type InferChildren<C> =
  C extends ODVRulesSchema ? InferSchema<C> : Record<string, unknown>

// Infer array element type from children with '*' wildcard
type InferArrayChildren<C> =
  C extends { readonly '*': infer StarRule }
    ? StarRule extends ODVRuleSchema
      ? InferRuleDef<StarRule>
      : unknown
    : unknown

// Refine a base type with children for objects and arrays
type RefineWithChildren<BaseType, Rule> =
  Rule extends { readonly children: infer C }
    ? BaseType extends unknown[]
      ? InferArrayChildren<C>[]
      : BaseType extends Record<string, unknown>
        ? InferChildren<C>
        : BaseType
    : BaseType

// Infer the TypeScript type for a single rule definition
type InferRuleDef<R> =
  R extends { readonly type: infer T }
    ? R extends { readonly in: infer InV }
      ? NarrowIn<InV, RefineWithChildren<MapType<T>, R>>
      : RefineWithChildren<MapType<T>, R>
    : unknown

// Meta-keys that are not field definitions
type MetaKey = '@' | '#' | '*'

// Extract keys where required: true
type RequiredKeys<S> = {
  [K in keyof S]: K extends MetaKey ? never :
    S[K] extends { readonly required: true } ? K : never
}[keyof S] & string

// Extract keys where required is not true
type OptionalKeys<S> = {
  [K in keyof S]: K extends MetaKey ? never :
    S[K] extends { readonly required: true } ? never : K
}[keyof S] & string

// Build the inferred object type from a schema
type InferSchema<S> =
  { -readonly [K in RequiredKeys<S>]: S[K] extends ODVRuleSchema ? InferRuleDef<S[K]> : unknown } &
  { -readonly [K in OptionalKeys<S>]?: S[K] extends ODVRuleSchema ? InferRuleDef<S[K]> : unknown }

/**
 * Infers the TypeScript type that a validated object would have, given a schema `S`.
 *
 * Fields with `required: true` become required properties; all others are optional.
 * The `type` field determines the property type, `in` narrows it to a literal union,
 * and `children` recurses for nested objects and arrays.
 *
 * @example
 * ```ts
 * const schema = {
 *   name: { type: 'string', required: true },
 *   age: { type: 'integer' },
 * } as const
 * type User = ODVInfer<typeof schema>
 * // { name: string; age?: number }
 * ```
 */
export type ODVInfer<S extends ODVRulesSchema> = InferSchema<S>
