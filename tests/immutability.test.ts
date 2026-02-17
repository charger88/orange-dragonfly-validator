import { parse, safeParse } from '../src/index'

const opts = { strictMode: false } as const

describe('input immutability', () => {
  test('safeParse does not mutate input with defaults', () => {
    const input: Record<string, unknown> = { a: 'existing' }
    safeParse({ a: { type: 'string' }, b: { type: 'string', default: 'added' } }, input, opts)
    expect(input.b).toBeUndefined()
    expect(Object.keys(input)).toEqual(['a'])
  })

  test('safeParse does not mutate input with apply_transformed', () => {
    const input: Record<string, unknown> = { val: '42' }
    safeParse(
      { val: { type: 'integer', transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } },
      input,
      opts,
    )
    expect(input.val).toBe('42')
  })

  test('safeParse does not add extra keys to input', () => {
    const input: Record<string, unknown> = {}
    const keysBefore = Object.keys(input)
    safeParse({ name: { type: 'string', default: 'test' } }, input, opts)
    expect(Object.keys(input)).toEqual(keysBefore)
  })

  test('parse returns processed data without mutating input', () => {
    const input: Record<string, unknown> = {}
    const result = parse(
      { name: { type: 'string' as const, default: 'Bob' } },
      input,
      opts,
    )
    expect(input.name).toBeUndefined()
    expect(result.name).toBe('Bob')
  })

  test('parse with apply_transformed returns transformed data without mutating input', () => {
    const input: Record<string, unknown> = { val: '42' }
    const result = parse(
      { val: { type: 'integer' as const, transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } },
      input,
      opts,
    )
    expect(input.val).toBe('42')
    expect(result.val).toBe(42)
  })
})

describe('schema immutability', () => {
  test('rules are not mutated across multiple safeParse calls', () => {
    const rules = { val: { type: 'string' as const, min: 1 } }
    const rulesCopy = JSON.stringify(rules)
    safeParse(rules, { val: 'a' }, opts)
    safeParse(rules, { val: 'b' }, opts)
    safeParse(rules, { val: '' }, opts)
    safeParse(rules, { val: 'c' }, opts)
    expect(JSON.stringify(rules)).toBe(rulesCopy)
  })

  test('type field is not mutated to array', () => {
    const rules = { val: { type: 'string' as const } }
    safeParse(rules, { val: 'test' }, opts)
    expect(rules.val.type).toBe('string')
  })

  test('number type does not get integer appended', () => {
    const rules = { val: { type: 'number' as const } }
    safeParse(rules, { val: 3.14 }, opts)
    expect(rules.val.type).toBe('number')
  })

  test('per_type rules are not contaminated across calls', () => {
    const rules = {
      val: {
        type: ['integer', 'string'] as const,
        per_type: {
          integer: { max: 100 },
          string: { max: 15 },
        },
      },
    }
    const rulesCopy = JSON.stringify(rules)
    safeParse(rules, { val: 99 }, opts)
    safeParse(rules, { val: 'short' }, opts)
    safeParse(rules, { val: 101 }, opts)
    expect(JSON.stringify(rules)).toBe(rulesCopy)
  })
})

describe('NaN and Infinity rejection', () => {
  test('NaN fails number type validation', () => {
    expect(safeParse({ val: { type: 'number' } }, { val: NaN }, opts).success).toBe(false)
  })

  test('Infinity fails number type validation', () => {
    expect(safeParse({ val: { type: 'number' } }, { val: Infinity }, opts).success).toBe(false)
  })

  test('-Infinity fails number type validation', () => {
    expect(safeParse({ val: { type: 'number' } }, { val: -Infinity }, opts).success).toBe(false)
  })

  test('NaN fails integer type validation', () => {
    expect(safeParse({ val: { type: 'integer' } }, { val: NaN }, opts).success).toBe(false)
  })

  test('NaN with no type constraint passes (no type check)', () => {
    expect(safeParse({ val: {} }, { val: NaN }, opts).success).toBe(true)
  })
})

describe('meta-key collision in strict mode', () => {
  test('input key @ is rejected in strict mode', () => {
    expect(safeParse({ name: { type: 'string' as const } }, { name: 'test', '@': 'bad' }).success).toBe(false)
  })

  test('input key # is rejected in strict mode', () => {
    expect(safeParse({ name: { type: 'string' as const } }, { name: 'test', '#': 'bad' }).success).toBe(false)
  })

  test('input key * is rejected in strict mode', () => {
    expect(safeParse({ name: { type: 'string' as const } }, { name: 'test', '*': 'bad' }).success).toBe(false)
  })
})
