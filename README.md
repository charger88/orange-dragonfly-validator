# Orange Dragonfly Validator

A type-safe, zero-dependency validation library for Node.js and TypeScript. Define schemas as plain objects, get validated and strongly-typed data back.

```typescript
import { parse } from 'orange-dragonfly-validator'

const schema = {
  name: { type: 'string', required: true, min: 1, max: 100 },
  email: { type: 'string', required: true, special: 'email' },
  age: { type: 'integer', min: 0, max: 150 },
} as const

const data = parse(schema, input)
// data: { name: string; email: string; age?: number }
```

## Features

- **Type inference** — output types are inferred from `as const` schemas, no manual typing needed
- **Zero dependencies** — nothing to audit, nothing to break
- **Dual format** — ships ESM and CommonJS with full TypeScript declarations
- **Structured errors** — machine-readable codes, human-readable messages, contextual parameters
- **Nested validation** — recursive schemas for objects and arrays of any depth
- **JSON Schema interop** — two-way conversion between ODValidator schemas and JSON Schema
- **Built-in format validators** — email, URL, UUID, phone, IPv4, date, datetime, hex color
- **Custom transforms** — transform values before or instead of validation

## Installation

```bash
npm install orange-dragonfly-validator
```

Requires Node.js 18 or later.

## Quick Start

### `parse` — validate and throw on failure

```typescript
import { parse, ODValidatorException } from 'orange-dragonfly-validator'

const schema = {
  name: { type: 'string', required: true, pattern: /^[A-Z][a-z]+$/ },
  position: { type: 'string', required: true },
  term_ends: { type: 'integer', min: 2025 },
} as const

try {
  const data = parse(schema, {
    name: 'Donald',
    position: 'President of the United States',
    term_ends: 2021,
  })
} catch (e) {
  if (e instanceof ODValidatorException) {
    console.error(e.info)
    // { term_ends: ['Minimal value (length) is 2025. 2021 provided'] }
  }
}
```

### `safeParse` — validate without throwing

```typescript
import { safeParse } from 'orange-dragonfly-validator'

const result = safeParse(schema, input)
if (result.success) {
  console.log(result.data.name) // typed as string
} else {
  console.log(result.errors) // Record<string, ODValidatorErrorEntry[]>
}
```

### `createValidator` — recommended for repeated validation

> **This is the recommended approach when you validate the same schema more than once** (e.g. in a request handler, a worker loop, or any hot path). The schema is normalised and compiled once at construction time, so each `validate()` call has no per-call setup cost.

```typescript
import { createValidator } from 'orange-dragonfly-validator'

const validator = createValidator({
  name: { type: 'string', required: true, min: 1, max: 100 },
  email: { type: 'string', required: true, special: 'email' },
  age: { type: 'integer', min: 0, max: 150 },
} as const)

// Create once, reuse across every request:
app.post('/users', (req, res) => {
  try {
    validator.validate(req.body)
    const data = validator.data // fully typed
    // …
  } catch (e) {
    res.status(400).json(e.info)
  }
})
```

`createValidator` accepts the same options as `ODValidator`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `strictMode` | `boolean` | `true` | Reject keys not defined in the schema |
| `exceptionMode` | `boolean` | `true` | Throw `ODValidatorException` on failure instead of returning `false` |
| `messageFormatter` | `function` | built-in | Custom `(code, params) => string` error formatter |

After `validate()`, read results from `validator.data` (processed input) and `validator.errors` (field-keyed error map).

### `ODValidator` — class-based usage

```typescript
import { ODValidator, ODValidatorRules } from 'orange-dragonfly-validator'

const rules = new ODValidatorRules(schema)
const validator = new ODValidator(rules, {
  strictMode: true,
  exceptionMode: true,
})

validator.validate(input)
console.log(validator.data)
console.log(validator.errors)
```

## Schema Reference

A schema is a plain object mapping field names to rule definitions. No field in a rule definition is required — an empty `{}` accepts any value.

### Rule Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string \| string[]` | Allowed type(s): `'string'`, `'number'`, `'integer'`, `'array'`, `'object'`, `'boolean'`, `'null'`, `'function'` |
| `required` | `boolean` | If `true`, field must be present in input |
| `default` | `any` | Value used when field is missing from input |
| `in` | `unknown[]` | Whitelist of allowed values |
| `in:public` | `unknown[] \| boolean` | Controls which `in` values appear in error messages. `true` exposes the `in` list; an array overrides it |
| `min` | `number` | Minimum value (numbers), length (strings), or item count (arrays) |
| `max` | `number` | Maximum value (numbers), length (strings), or item count (arrays) |
| `pattern` | `RegExp \| string` | Regex the value must match (strings only). `RegExp` objects are used as-is |
| `special` | `string` | Built-in format validator name (see [Format Validators](#format-validators)) |
| `transform` | `function` | `(value: unknown) => unknown` — transforms value before validation |
| `apply_transformed` | `boolean` | If `true`, the transformed value replaces the original in output |
| `children` | `ODValidatorRulesSchema` | Nested schema for object properties or array elements |
| `per_type` | `object` | Type-specific rule overrides (see [Per-Type Rules](#per-type-rules)) |

Keys named `__proto__`, `constructor`, and `prototype` are rejected anywhere in input data or schema definitions. Encountering one throws `ODValidatorSecurityException`.

### Meta-Keys

Schemas support special meta-keys that control behavior at the schema level:

```typescript
const schema = {
  '@': { strict: false },       // Schema options
  '#': { type: 'string', pattern: /^[a-z_]+$/ },  // Key name validator
  '*': { type: 'string', max: 255 },               // Wildcard — applies to all values

  // Regular field rules
  name: { type: 'string', required: true },
} as const
```

| Key | Purpose |
|-----|---------|
| `@` | Schema-level options. Currently supports `strict` (boolean, default `true`) — when `true`, rejects input keys not defined in the schema |
| `#` | Key validator — validates the property names themselves, not values |
| `*` | Wildcard rule — applied to every value in the input |

### Nested Validation

Use `children` to validate nested objects and arrays:

```typescript
const schema = {
  users: {
    type: 'array',
    required: true,
    min: 1,
    children: {
      '*': {                    // Every array element must match this rule
        type: 'object',
        children: {
          name: { type: 'string', required: true },
          role: { type: 'string', in: ['admin', 'user'] },
        },
      },
    },
  },
  settings: {
    type: 'object',
    children: {
      '@': { strict: false },   // Allow any keys in settings
      '#': { pattern: /^[a-z_]+$/ }, // But key names must be lowercase
      '*': { type: 'string' },  // And all values must be strings
    },
  },
} as const
```

### Per-Type Rules

When a field accepts multiple types, use `per_type` to apply different constraints per type:

```typescript
const schema = {
  value: {
    type: ['string', 'number'],
    per_type: {
      string: { min: 1, max: 255 },    // String length 1–255
      number: { min: 0, max: 1000 },    // Numeric value 0–1000
    },
  },
} as const
```

`per_type` accepts: `in`, `in:public`, `min`, `max`, `pattern`, `special`, `transform`, `apply_transformed`, `children`.

## Schema Builder

Use `ODValidatorRules.create()` for fluent schema construction with full autocomplete:

```typescript
import { ODValidatorRules, parse } from 'orange-dragonfly-validator'

const rules = ODValidatorRules.create()
  .property('name', p => p.required().string().min(1).max(100))
  .property('email', p => p.required().string().special('email'))
  .property('age', p => p.integer().min(0).max(150))
  .property('role', p => p.string().in(['admin', 'user']).default('user'))
  .strict()
  .complete()

const validator = new ODValidator(rules)
validator.validate(input)
```

The builder can also produce a raw schema for use with `parse` and `safeParse`:

```typescript
const schema = ODValidatorRules.create()
  .property('name', p => p.required().string())
  .toSchema()

const data = parse(schema, input)
```

### Nested Schemas with the Builder

Use `.children()` and `.wildcard()` for nested validation:

```typescript
const rules = ODValidatorRules.create()
  .property('users', p => p.required().array().min(1)
    .children(c => c
      .wildcard(p => p.object()
        .children(c => c
          .property('name', p => p.required().string())
          .property('role', p => p.string().in(['admin', 'user']))
        )
      )
    )
  )
  .property('settings', p => p.object()
    .children(c => c
      .strict(false)
      .keyValidator(p => p.pattern(/^[a-z_]+$/))
      .wildcard(p => p.string().max(255))
    )
  )
  .complete()
```

### Multi-Type Fields with the Builder

Use `.perType()` or chain multiple type methods:

```typescript
const rules = ODValidatorRules.create()
  .property('value', p => p.string().number()
    .perType('string', p => p.min(1).max(255))
    .perType('number', p => p.min(0).max(1000))
  )
  .complete()
```

### Builder API Reference

**`ODValidatorSchemaBuilder`** (returned by `ODValidatorRules.create()`):

| Method | Description |
|--------|-------------|
| `.property(name, configure)` | Add a named field rule |
| `.wildcard(configure)` | Set the `*` (all values) rule |
| `.keyValidator(configure)` | Set the `#` (key name) validator |
| `.strict(value?)` | Set strict mode (default `true`) |
| `.toSchema()` | Return the built `ODValidatorRulesSchema` |
| `.complete()` | Return an `ODValidatorRules` instance |

**`ODValidatorPropertyBuilder`** (passed to configure callbacks):

| Method | Description |
|--------|-------------|
| `.string()`, `.number()`, `.integer()`, `.boolean()`, `.array()`, `.object()`, `.null()` | Add an allowed type |
| `.type(t)` | Add type(s) by name |
| `.required()` | Mark as required |
| `.default(value)` | Set default value |
| `.min(n)`, `.max(n)` | Set min/max constraint |
| `.in(values)` | Set allowed values whitelist |
| `.inPublic(values)` | Control `in` values in error messages |
| `.pattern(p)` | Set regex pattern |
| `.special(name)` | Set built-in format validator |
| `.transform(fn)` | Set transform function |
| `.applyTransformed()` | Replace original with transformed value |
| `.children(configure)` | Set nested schema (receives `ODValidatorSchemaBuilder`) |
| `.perType(type, configure)` | Set type-specific overrides |

## Type Inference

Schemas declared with `as const` (or `as const satisfies ODValidatorRulesSchema`) enable full type inference on validated data:

```typescript
import { parse, type ODValidatorInfer, type ODValidatorRulesSchema } from 'orange-dragonfly-validator'

const schema = {
  name: { type: 'string', required: true },
  age: { type: 'integer' },
  status: { type: 'string', in: ['active', 'inactive'] },
  tags: {
    type: 'array',
    children: {
      '*': { type: 'string' },
    },
  },
} as const satisfies ODValidatorRulesSchema

// Extract the type without calling parse
type UserInput = ODValidatorInfer<typeof schema>
// {
//   name: string
//   age?: number
//   status?: 'active' | 'inactive'
//   tags?: string[]
// }

// parse() returns the same type
const data = parse(schema, input)
data.name    // string (required)
data.age     // number | undefined (optional)
data.status  // 'active' | 'inactive' | undefined
data.tags    // string[] | undefined
```

### How Inference Works

- `required: true` fields become required properties; all others are optional
- `type` maps to its TypeScript equivalent (`'integer'` and `'number'` both map to `number`)
- `in` narrows the type to a literal union
- `children` recurses for nested objects and arrays

## Format Validators

Use the `special` property to apply built-in format validation:

```typescript
const schema = {
  email:    { type: 'string', special: 'email' },
  website:  { type: 'string', special: 'url' },
  id:       { type: 'string', special: 'uuid' },
  phone:    { type: 'string', special: 'phone' },
  usPhone:  { type: 'string', special: 'us-phone' },
  ip:       { type: 'string', special: 'ipv4' },
  birthday: { type: 'string', special: 'date' },
  created:  { type: 'string', special: 'datetime' },
  color:    { type: 'string', special: 'hex-color' },
} as const
```

| Name | Format | Example |
|------|--------|---------|
| `email` | RFC 5321 | `user@example.com` |
| `phone` | E.164 international | `+12025551234` |
| `us-phone` | US format (+1 + 10 digits) | `+12025551234` |
| `url` | HTTP/HTTPS with optional port/path | `https://example.com:8080/path` |
| `uuid` | v1–5, case-insensitive | `550e8400-e29b-41d4-a716-446655440000` |
| `ipv4` | Four octets (0–255) | `192.168.1.1` |
| `date` | ISO 8601 date | `2025-02-16` |
| `datetime` | ISO 8601 with timezone | `2025-02-16T12:34:56Z` |
| `hex-color` | Hex (#RGB, #RRGGBB, #RRGGBBAA) | `#FF00FF` |

The underlying RegExp patterns are also exported individually (`EMAIL_PATTERN`, `URL_PATTERN`, etc.) and as the `SPECIAL_VALIDATORS` map for custom use.

> **Note:** Built-in format validators use simplified regex patterns optimized for common cases. For example, the `email` validator covers standard addresses per RFC 5321 but does not support quoted local parts or comments. For domain-specific requirements, use `pattern` with your own regex.

## Transforms

Use `transform` to modify values before validation. Combine with `apply_transformed` to include the transformed value in the output:

```typescript
const schema = {
  email: {
    type: 'string',
    required: true,
    special: 'email',
    transform: (v) => typeof v === 'string' ? v.toLowerCase().trim() : v,
    apply_transformed: true,  // Output will contain the lowercased, trimmed email
  },
  score: {
    type: 'number',
    transform: (v) => typeof v === 'string' ? parseFloat(v) : v,
    apply_transformed: true,
  },
} as const
```

Without `apply_transformed`, the transform is only used for validation — the original value is preserved in the output.

## Error Handling

### Error Structure

Every validation error includes a machine-readable code, a human-readable message, and contextual parameters:

```typescript
interface ODValidatorErrorEntry {
  code: string                        // e.g. 'TYPE_MISMATCH'
  message: string                     // e.g. 'Incorrect type: string required, number provided'
  params?: Record<string, unknown>    // e.g. { expected: 'string', actual: 'number' }
}

// Errors are keyed by field path
type ODValidatorErrors = Record<string, ODValidatorErrorEntry[]>
// e.g. { 'users.0.name': [{ code, message, params }] }
```

### Error Codes

| Code | Meaning |
|------|---------|
| `REQUIRED` | Required field is missing |
| `NOT_ALLOWED` | Field is not defined in schema (strict mode) |
| `TYPE_MISMATCH` | Value type doesn't match `type` constraint |
| `MIN_VIOLATION` | Value/length/count is below `min` |
| `MAX_VIOLATION` | Value/length/count is above `max` |
| `PATTERN_MISMATCH` | Value doesn't match `pattern` regex |
| `INVALID_FORMAT` | Value doesn't match `special` format |
| `VALUE_NOT_IN_LIST` | Value is not in the `in` whitelist |
| `ARRAY_ELEMENT_NOT_IN_LIST` | Array contains elements not in `in` list |
| `CHILDREN_TYPE_ERROR` | `children` applied to non-object/non-array |

Error codes are available as the `ErrorCode` constant for programmatic comparison.

### Exception Types

```typescript
import { ODValidatorException, ODValidatorRulesException, ODValidatorSecurityException } from 'orange-dragonfly-validator'

// ODValidatorException — input validation failed (expected at runtime)
try {
  parse(schema, badInput)
} catch (e) {
  if (e instanceof ODValidatorException) {
    e.details  // ODValidatorErrors — full structured errors
    e.info     // Record<string, string[]> — simplified (field → messages)
    e.message  // 'Validation failed'
  }
}

// ODValidatorRulesException — schema itself is invalid (programming error)
// Extends ODValidatorException. Thrown by parse, safeParse, and validateSchema.

// ODValidatorSecurityException — poisoned key detected in input or schema
// Thrown before validation continues.
```

`safeParse` catches `ODValidatorException` and returns `{ success: false, errors }` instead — but still throws `ODValidatorRulesException` since invalid schemas are programming errors.

### Custom Error Messages

Provide a `messageFormatter` to customize or localize error messages:

```typescript
import { parse, type ODValidatorMessageFormatter } from 'orange-dragonfly-validator'

const messageFormatter: ODValidatorMessageFormatter = (code, params) => {
  switch (code) {
    case 'REQUIRED': return 'This field is required'
    case 'TYPE_MISMATCH': return `Expected ${params.expected}, got ${params.actual}`
    case 'MIN_VIOLATION': return `Must be at least ${params.min}`
    case 'MAX_VIOLATION': return `Must be at most ${params.max}`
    default: return 'Invalid value'
  }
}

const data = parse(schema, input, { messageFormatter })
```

## JSON Schema Interop

Convert between ODValidator schemas and JSON Schema (draft-07 / 2020-12):

```typescript
import { fromJsonSchema, toJsonSchema } from 'orange-dragonfly-validator'

// JSON Schema → ODValidator
const { schema, warnings } = fromJsonSchema({
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    age: { type: 'integer', minimum: 0 },
  },
  required: ['name'],
})
// warnings lists any unsupported features that were skipped

// ODValidator → JSON Schema
const jsonSchema = toJsonSchema(odvSchema)
```

### Supported JSON Schema Features

`type`, `properties`, `required`, `items`, `enum`, `const`, `default`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minLength`, `maxLength`, `minItems`, `maxItems`, `pattern`, `format`, `additionalProperties`, `propertyNames`.

### Unsupported JSON Schema Features

`$ref`, `oneOf`, `anyOf`, `allOf`, `not`, `if`/`then`/`else`, `dependencies`, `prefixItems`, `contains`, `patternProperties`. These generate warnings during conversion and are silently skipped.

## Schema Validation

Validate that a plain JSON object is a well-formed ODValidator schema (useful when schemas come from external sources):

```typescript
import { validateSchema } from 'orange-dragonfly-validator'

try {
  const schema = validateSchema(jsonFromExternalSource)
  // schema is now typed as ODValidatorRulesSchema
} catch (e) {
  // ODValidatorRulesException — schema is malformed
}
```

## API Reference

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `parse<S>(schema, input, options?, errorsPrefix?): ODValidatorInfer<S>` | Validate and return typed data. Throws `ODValidatorException` on failure |
| `safeParse` | `safeParse<S>(schema, input, options?, errorsPrefix?): SafeParseResult<S>` | Like `parse` but returns `{ success, data }` or `{ success, errors }` instead of throwing |
| `validateSchema` | `validateSchema(json): ODValidatorRulesSchema` | Validates a JSON object is a well-formed schema. Throws `ODValidatorRulesException` if not |
| `fromJsonSchema` | `fromJsonSchema(jsonSchema): { schema, warnings }` | Convert JSON Schema to ODValidator schema |
| `toJsonSchema` | `toJsonSchema(schema): JsonSchema` | Convert ODValidator schema to JSON Schema |

### Classes

| Class | Description |
|-------|-------------|
| `ODValidator` | Core validator with `validate(input)` method, `data`/`errors` properties, and configurable `strictMode`/`exceptionMode` |
| `ODValidatorRules` | Schema container with static `validate()` and `normalize()` methods |
| `ODValidatorRule` | Single rule processor with `apply()` method |
| `ODValidatorException` | Validation failure error with `details` (structured) and `info` (simplified) |
| `ODValidatorRulesException` | Schema definition error (extends `ODValidatorException`) |
| `ODValidatorSecurityException` | Unsafe key detected in input or schema |

### Types

| Type | Description |
|------|-------------|
| `ODValidatorInfer<S>` | Infers TypeScript type from a schema |
| `SafeParseResult<S>` | Discriminated union: `{ success: true; data: ODValidatorInfer<S> } \| { success: false; errors: ODValidatorErrors }` |
| `ODValidatorRulesSchema` | Schema object type |
| `ODValidatorRuleSchema` | Single rule definition type |
| `ODValidatorPerTypeRuleSchema` | Per-type override rule type |
| `ODValidatorOptions` | Constructor options for `ODValidator` |
| `ODValidatorErrors` | `Record<string, ODValidatorErrorEntry[]>` |
| `ODValidatorErrorEntry` | `{ code: string; message: string; params?: Record<string, unknown> }` |
| `ODValidatorErrorCode` | Union of all error code string literals |
| `ODValidatorMessageFormatter` | `(code: ODValidatorErrorCode, params: Record<string, unknown>) => string` |
| `ODValidatorValueType` | `'string' \| 'number' \| 'integer' \| 'array' \| 'object' \| 'boolean' \| 'function' \| 'null'` |
| `JsonSchema` | JSON Schema type definition |
| `FromJsonSchemaResult` | `{ schema: ODValidatorRulesSchema; warnings: string[] }` |

## Architecture

```
Input + Schema
      │
      ▼
  parse() / safeParse()
      │
      ▼
  ODValidatorRules ─── normalizes schema (deep clone, type normalization)
      │
      ▼
  ODValidator.process()
      │
      ├── Apply wildcard ('*') rules to all values
      ├── Validate key names ('#') if defined
      ├── Apply defaults for missing fields
      ├── For each field:
      │     └── ODValidatorRule.applyRule()
      │           ├── transform (if defined)
      │           ├── type check
      │           ├── per_type overrides (if matched)
      │           ├── min / max constraints
      │           ├── in (whitelist) check
      │           ├── pattern / special format check
      │           └── children (recursive)
      ├── Enforce strict mode (reject undeclared keys)
      │
      ▼
  Typed data or structured errors
```

- Fields are validated independently — errors are accumulated (not short-circuited)
- Input is shallow-cloned; the original object is never mutated
- Schema normalization adds `'integer'` when `'number'` is specified, and normalizes single types to arrays

## Limitations

- **No cross-field dependencies** — each field is validated independently. Use `transform` or multi-pass validation for dependent fields
- **No union schemas** — `oneOf`/`anyOf`/`allOf` from JSON Schema are not supported
- **No conditional logic** — `if`/`then`/`else` is not supported
- **No async validation** — all validation is synchronous
- **No schema composition** — no `pick`/`omit`/`partial`/`merge` utilities; compose schemas manually
- **No pattern complexity validation** — `pattern` values (RegExp or string) are used as-is. Schemas should be defined by developers, not constructed from end-user input. If you accept patterns from untrusted sources, validate them externally to prevent [ReDoS](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS) attacks
- **Stateful `RegExp` objects are not reset** — if you pass a `pattern` with the `g` or `y` flag, validation reuses that same object and will mutate its `lastIndex`. Do not share that `RegExp` instance with unrelated logic or rely on its state after validation

## License

ISC
