import { parse, safeParse } from '../src/index'
import type { ODVInfer } from '../src/index'
import type { ODVRulesSchema } from '../src/index'

/**
 * Compile-time type equality check.
 * If A and B are not the same type, this produces a type error at the call site.
 */
type IsExact<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false
function assertType<_T extends true>(): void { /* compile-time only */ }

// ─── Basic type mapping ──────────────────────────────────────────────

test('infer string type', () => {
  const schema = { name: { type: 'string', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['name'], string>>()

  const data = parse(schema, { name: 'Alice' })
  expect(data.name).toBe('Alice')
})

test('infer integer type maps to number', () => {
  const schema = { age: { type: 'integer', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['age'], number>>()

  const data = parse(schema, { age: 30 })
  expect(data.age).toBe(30)
})

test('infer number type', () => {
  const schema = { score: { type: 'number', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['score'], number>>()
})

test('infer boolean type', () => {
  const schema = { active: { type: 'boolean', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['active'], boolean>>()
})

test('infer null type', () => {
  const schema = { empty: { type: 'null', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['empty'], null>>()
})

test('infer array type', () => {
  const schema = { items: { type: 'array', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['items'], unknown[]>>()
})

test('infer object type', () => {
  const schema = { meta: { type: 'object', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['meta'], Record<string, unknown>>>()
})

test('infer function type', () => {
  const schema = { handler: { type: 'function', required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['handler'], (...args: unknown[]) => unknown>>()
})

// ─── Required vs optional ────────────────────────────────────────────

test('required fields are not optional', () => {
  const schema = {
    name: { type: 'string', required: true },
    age: { type: 'integer' },
  } as const
  type Result = ODVInfer<typeof schema>

  // name is required
  assertType<IsExact<Result['name'], string>>()
  // age is optional (number | undefined)
  const result: Result = { name: 'test' }
  expect(result.name).toBe('test')
  expect(result.age).toBeUndefined()
})

test('all optional fields', () => {
  const schema = {
    a: { type: 'string' },
    b: { type: 'integer' },
  } as const
  type Result = ODVInfer<typeof schema>

  const result: Result = {}
  expect(result.a).toBeUndefined()
})

test('all required fields', () => {
  const schema = {
    a: { type: 'string', required: true },
    b: { type: 'integer', required: true },
  } as const
  type Result = ODVInfer<typeof schema>

  // Both must be present — this is a compile-time check
  const result: Result = { a: 'hello', b: 42 }
  expect(result.a).toBe('hello')
  expect(result.b).toBe(42)
})

// ─── Union types ─────────────────────────────────────────────────────

test('infer union of string | number', () => {
  const schema = { val: { type: ['string', 'number'], required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['val'], string | number>>()
})

test('infer union of string | boolean | null', () => {
  const schema = { val: { type: ['string', 'boolean', 'null'], required: true } } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['val'], string | boolean | null>>()
})

// ─── Narrowing with `in` ────────────────────────────────────────────

test('infer narrows with in constraint', () => {
  const schema = {
    status: { type: 'string', required: true, in: ['active', 'inactive'] },
  } as const
  type Result = ODVInfer<typeof schema>
  // Should narrow to literal union
  assertType<IsExact<Result['status'], 'active' | 'inactive'>>()

  const data = parse(schema, { status: 'active' })
  expect(data.status).toBe('active')
})

test('infer narrows integer with in constraint', () => {
  const schema = {
    level: { type: 'integer', required: true, in: [1, 2, 3] },
  } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['level'], 1 | 2 | 3>>()
})

// ─── Nested children ────────────────────────────────────────────────

test('infer nested object children', () => {
  const schema = {
    address: {
      type: 'object',
      required: true,
      children: {
        street: { type: 'string', required: true },
        zip: { type: 'string' },
      },
    },
  } as const
  type Result = ODVInfer<typeof schema>
  type Address = Result['address']
  assertType<IsExact<Address['street'], string>>()

  const data = parse(schema, { address: { street: '123 Main' } })
  expect(data.address.street).toBe('123 Main')
})

test('infer array children with wildcard', () => {
  const schema = {
    tags: {
      type: 'array',
      required: true,
      children: {
        '*': { type: 'string' },
      },
    },
  } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['tags'], string[]>>()
})

test('infer deeply nested schema', () => {
  const schema = {
    user: {
      type: 'object',
      required: true,
      children: {
        name: { type: 'string', required: true },
        profile: {
          type: 'object',
          children: {
            bio: { type: 'string' },
          },
        },
      },
    },
  } as const
  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['user']['name'], string>>()
})

// ─── parse() return type ─────────────────────────────────────────────

test('parse returns correctly inferred type', () => {
  const schema = {
    name: { type: 'string', required: true },
    age: { type: 'integer' },
    active: { type: 'boolean', required: true },
  } as const

  const data = parse(schema, { name: 'Alice', age: 30, active: true })

  // These assignments verify the return type at compile time
  const name: string = data.name
  const active: boolean = data.active
  expect(name).toBe('Alice')
  expect(active).toBe(true)
})

// ─── safeParse() return type ─────────────────────────────────────────

test('safeParse success branch has typed data', () => {
  const schema = {
    name: { type: 'string', required: true },
  } as const

  const result = safeParse(schema, { name: 'Alice' })
  if (result.success) {
    const name: string = result.data.name
    expect(name).toBe('Alice')
  } else {
    throw new Error('Expected success')
  }
})

test('safeParse failure branch has errors', () => {
  const schema = {
    name: { type: 'string', required: true },
  } as const

  const result = safeParse(schema, {})
  if (!result.success) {
    expect(result.errors).toBeDefined()
    expect(result.errors.name).toBeDefined()
  } else {
    throw new Error('Expected failure')
  }
})

// ─── Mixed required/optional with nested children ────────────────────

test('complex schema inference', () => {
  const schema = {
    id: { type: 'integer', required: true },
    name: { type: 'string', required: true },
    email: { type: 'string' },
    roles: {
      type: 'array',
      required: true,
      children: {
        '*': { type: 'string' },
      },
    },
    settings: {
      type: 'object',
      children: {
        theme: { type: 'string', in: ['light', 'dark'] },
        notifications: { type: 'boolean' },
      },
    },
  } as const

  type Result = ODVInfer<typeof schema>
  assertType<IsExact<Result['id'], number>>()
  assertType<IsExact<Result['name'], string>>()
  assertType<IsExact<Result['roles'], string[]>>()

  const data = parse(schema, {
    id: 1,
    name: 'Alice',
    roles: ['admin'],
    settings: { theme: 'dark', notifications: true },
  })
  expect(data.id).toBe(1)
  expect(data.roles).toEqual(['admin'])
})

// ─── ODVRules instance with parse ────────────────────────────────────

test('parse accepts ODVRules and infers types', () => {
  const { ODVRules } = require('../src/index')
  const schema = { name: { type: 'string', required: true } } as const
  const rules = new ODVRules(schema)
  const data = parse(rules, { name: 'test' })
  expect(data.name).toBe('test')
})

// ─── Empty schema ────────────────────────────────────────────────────

test('empty schema infers empty object', () => {
  const schema = {} as const
  type Result = ODVInfer<typeof schema>
  const result: Result = {}
  expect(result).toEqual({})
})
