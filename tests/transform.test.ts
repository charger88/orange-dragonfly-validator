import { parse, safeParse, ErrorCode } from '../src/index'
import type { ODVRulesSchema } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('transform - basic', () => {
  test('transform converts value before type check', () => {
    expect(passes({ val: { type: 'integer' } }, { val: '5' })).toBe(false)
    expect(passes({ val: { type: 'integer', transform: (v) => parseInt(v as string, 10) } }, { val: '5' })).toBe(true)
  })

  test('transform does not mutate original input', () => {
    const input = { val: '5' }
    safeParse({ val: { type: 'integer', transform: (v) => parseInt(v as string, 10) } } as ODVRulesSchema, input, opts)
    expect(input.val).toBe('5')
  })

  test('apply_transformed returns transformed data', () => {
    const schema = { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } } as const
    const data = parse(schema, { val: '5' }, opts)
    expect(data.val).toBe(5)
  })

  test('apply_transformed does not mutate original input', () => {
    const input = { val: '5' }
    parse({ val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } } as const, input, opts)
    expect(input.val).toBe('5')
  })
})

describe('transform - type coercion', () => {
  test('string to number', () => {
    expect(passes({ val: { type: 'number', transform: (v) => Number(v) } }, { val: '3.14' })).toBe(true)
  })

  test('string to boolean', () => {
    const schema: ODVRulesSchema = { val: { type: 'boolean', transform: (v) => v === 'true' } }
    expect(passes(schema, { val: 'true' })).toBe(true)
    expect(passes(schema, { val: 'false' })).toBe(true)
  })

  test('number to string', () => {
    expect(passes({ val: { type: 'string', transform: (v) => String(v) } }, { val: 42 })).toBe(true)
  })

  test('trim whitespace', () => {
    const schema: ODVRulesSchema = { val: { type: 'string', transform: (v) => (v as string).trim(), min: 1 } }
    expect(passes(schema, { val: '  hello  ' })).toBe(true)
    expect(passes(schema, { val: '   ' })).toBe(false)
  })
})

describe('transform - validation after transform', () => {
  test('transform result is validated against type', () => {
    expect(passes({ val: { type: 'integer', transform: () => 'not-a-number' } }, { val: 42 })).toBe(false)
  })

  test('transform result is validated against min/max', () => {
    const schema: ODVRulesSchema = { val: { type: 'integer', transform: (v) => (v as number) * 10, min: 50 } }
    expect(passes(schema, { val: 3 })).toBe(false)  // 30 < 50
    expect(passes(schema, { val: 6 })).toBe(true)   // 60 >= 50
  })

  test('transform result is validated against pattern', () => {
    const schema: ODVRulesSchema = { val: { type: 'string', transform: (v) => (v as string).toLowerCase(), pattern: /^[a-z]+$/ } }
    expect(passes(schema, { val: 'HELLO' })).toBe(true)
  })

  test('transform result is validated against in list', () => {
    const schema: ODVRulesSchema = { val: { type: 'string', transform: (v) => (v as string).toLowerCase(), in: ['yes', 'no'] } }
    expect(passes(schema, { val: 'YES' })).toBe(true)
    expect(passes(schema, { val: 'MAYBE' })).toBe(false)
  })
})

describe('transform - apply_transformed', () => {
  test('without apply_transformed, parse output has original value', () => {
    const schema = { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10) } } as const
    const data = parse(schema, { val: '42' }, opts)
    expect(data.val).toBe('42')
  })

  test('with apply_transformed, parse output has transformed value', () => {
    const schema = { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } } as const
    const data = parse(schema, { val: '42' }, opts)
    expect(data.val).toBe(42)
  })

  test('apply_transformed with multiple fields', () => {
    const schema = {
      name: { type: 'string', transform: (v: unknown) => (v as string).trim(), apply_transformed: true },
      age: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true },
    } as const
    const data = parse(schema, { name: '  Alice  ', age: '30' }, opts)
    expect(data.name).toBe('Alice')
    expect(data.age).toBe(30)
  })

  test('apply_transformed does not mutate original input', () => {
    const schema: ODVRulesSchema = { val: { type: 'integer', transform: (v) => parseInt(v as string, 10), apply_transformed: true } }
    const input = { val: '42' }
    safeParse(schema, input, opts)
    expect(input.val).toBe('42')
  })
})

describe('transform - with parse and safeParse', () => {
  test('parse returns transformed data', () => {
    const schema = { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } } as const
    const result = parse(schema, { val: '42' }, opts)
    expect(result.val).toBe(42)
  })

  test('safeParse returns transformed data on success', () => {
    const schema = { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } } as const
    const result = safeParse(schema, { val: '42' }, opts)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.val).toBe(42)
    }
  })

  test('safeParse returns errors when transform produces invalid value', () => {
    const schema = { val: { type: 'integer', transform: () => 'not-an-int' } } as const
    const result = safeParse(schema, { val: '42' }, opts)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.TYPE_MISMATCH)
    }
  })
})

describe('transform - with special validators', () => {
  test('transform before special validation', () => {
    const schema: ODVRulesSchema = {
      val: { type: 'string', special: 'email', transform: (v) => (v as string).toLowerCase().trim() },
    }
    expect(passes(schema, { val: '  User@Example.COM  ' })).toBe(true)
  })
})

describe('transform - with children', () => {
  test('transform on field with children', () => {
    const schema: ODVRulesSchema = {
      val: {
        type: 'object',
        transform: (v) => typeof v === 'string' ? JSON.parse(v) : v,
        children: {
          name: { type: 'string', required: true },
        },
      },
    }
    expect(passes(schema, { val: { name: 'Alice' } })).toBe(true)
  })
})

describe('transform - wildcard with apply_transformed', () => {
  test('transform applied to array elements via wildcard', () => {
    const schema: ODVRulesSchema = {
      items: {
        type: 'array',
        children: {
          '*': { type: 'integer', transform: (v) => parseInt(v as string, 10), apply_transformed: true },
        },
      },
    }
    expect(passes(schema, { items: ['1', '2', '3'] })).toBe(true)
  })
})

describe('transform - edge cases', () => {
  test('transform returning undefined', () => {
    expect(passes({ val: { type: 'string', transform: () => undefined } }, { val: 'hello' })).toBe(false)
  })

  test('transform returning null', () => {
    expect(passes({ val: { type: 'null', transform: () => null } }, { val: 'hello' })).toBe(true)
  })

  test('identity transform', () => {
    expect(passes({ val: { type: 'string', transform: (v) => v } }, { val: 'hello' })).toBe(true)
  })
})
