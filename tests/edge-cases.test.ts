import { safeParse } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('empty and minimal inputs', () => {
  test('empty rules and empty input passes', () => {
    expect(passes({}, {})).toBe(true)
  })

  test('empty rules with input passes in non-strict mode', () => {
    expect(passes({}, { a: 1 })).toBe(true)
  })

  test('empty rules with input fails in strict mode', () => {
    expect(safeParse({}, { a: 1 }, { strictMode: true }).success).toBe(false)
  })

  test('rule with no constraints passes any value', () => {
    expect(passes({ val: {} }, { val: 'anything' })).toBe(true)
    expect(passes({ val: {} }, { val: 123 })).toBe(true)
    expect(passes({ val: {} }, { val: null })).toBe(true)
  })
})

describe('null handling', () => {
  test('null type accepted when declared', () => {
    expect(passes({ val: { type: 'null' } }, { val: null })).toBe(true)
  })

  test('null rejected when not in type list', () => {
    expect(passes({ val: { type: 'string' } }, { val: null })).toBe(false)
  })

  test('null skips min/max/pattern/in checks', () => {
    expect(passes(
      { val: { type: ['null', 'string'], min: 5, pattern: /^[a-z]+$/ } },
      { val: null },
    )).toBe(true)
  })

  test('multi-type with null', () => {
    const rules = { val: { type: ['string', 'null'] as const } }
    expect(passes(rules, { val: 'hello' })).toBe(true)
    expect(passes(rules, { val: null })).toBe(true)
    expect(passes(rules, { val: 123 })).toBe(false)
  })
})

describe('multi-type fields', () => {
  test('string or integer accepts both', () => {
    const rules = { val: { type: ['string', 'integer'] as const } }
    expect(passes(rules, { val: 'hello' })).toBe(true)
    expect(passes(rules, { val: 42 })).toBe(true)
    expect(passes(rules, { val: true })).toBe(false)
  })

  test('number type also accepts integer', () => {
    const rules = { val: { type: 'number' as const } }
    expect(passes(rules, { val: 3.14 })).toBe(true)
    expect(passes(rules, { val: 42 })).toBe(true)
  })
})

describe('input immutability', () => {
  test('input is not mutated with defaults', () => {
    const input: Record<string, unknown> = { a: 'existing' }
    safeParse({ a: { type: 'string' }, b: { type: 'string', default: 'added' } }, input, opts)
    expect(input.b).toBeUndefined()
    expect(input.a).toBe('existing')
  })

  test('input is not mutated with apply_transformed', () => {
    const input: Record<string, unknown> = { val: '42' }
    safeParse(
      { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } },
      input,
      opts,
    )
    expect(input.val).toBe('42')
  })

  test('input is not mutated without apply_transformed', () => {
    const input: Record<string, unknown> = { val: '42' }
    safeParse(
      { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10) } },
      input,
      opts,
    )
    expect(input.val).toBe('42')
  })
})

describe('type edge cases', () => {
  test('NaN is rejected for number type', () => {
    expect(passes({ val: { type: 'number' } }, { val: NaN })).toBe(false)
  })

  test('Infinity is rejected for number type', () => {
    expect(passes({ val: { type: 'number' } }, { val: Infinity })).toBe(false)
  })

  test('empty object passes object type', () => {
    expect(passes({ val: { type: 'object' } }, { val: {} })).toBe(true)
  })

  test('empty array passes array type', () => {
    expect(passes({ val: { type: 'array' } }, { val: [] })).toBe(true)
  })

  test('empty string passes string type', () => {
    expect(passes({ val: { type: 'string' } }, { val: '' })).toBe(true)
  })

  test('0 passes integer type', () => {
    expect(passes({ val: { type: 'integer' } }, { val: 0 })).toBe(true)
  })

  test('false passes boolean type', () => {
    expect(passes({ val: { type: 'boolean' } }, { val: false })).toBe(true)
  })
})

describe('rules reuse across multiple calls', () => {
  test('same rules object can be used multiple times', () => {
    const rules = { val: { type: 'string' as const, min: 1 } }
    expect(passes(rules, { val: 'a' })).toBe(true)
    expect(passes(rules, { val: 'b' })).toBe(true)
    expect(passes(rules, { val: '' })).toBe(false)
    expect(passes(rules, { val: 'c' })).toBe(true)
  })
})

describe('function type', () => {
  test('function type is accepted', () => {
    expect(passes({ val: { type: 'function' } }, { val: () => {} })).toBe(true)
  })

  test('non-function rejected for function type', () => {
    expect(passes({ val: { type: 'function' } }, { val: 'not a function' })).toBe(false)
  })
})
