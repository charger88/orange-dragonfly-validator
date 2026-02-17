import { parse, safeParse, ErrorCode } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('required', () => {
  test('required field present passes', () => {
    expect(passes({ name: { type: 'string', required: true } }, { name: 'Alice' })).toBe(true)
  })

  test('required field missing fails', () => {
    expect(passes({ name: { type: 'string', required: true } }, {})).toBe(false)
  })

  test('required field missing has correct error', () => {
    const result = safeParse({ name: { type: 'string', required: true } }, {})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name[0].code).toBe(ErrorCode.REQUIRED)
      expect(result.errors.name[0].message).toBe('Parameter required')
    }
  })

  test('non-required field missing passes', () => {
    expect(passes({ name: { type: 'string' } }, {})).toBe(true)
  })

  test('multiple required fields - one missing', () => {
    const rules = {
      a: { type: 'string' as const, required: true },
      b: { type: 'string' as const, required: true },
    }
    const result = safeParse(rules, { a: 'hello' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.b[0].code).toBe(ErrorCode.REQUIRED)
      expect(result.errors.a).toBeUndefined()
    }
  })

  test('multiple required fields - all missing', () => {
    const rules = {
      a: { type: 'string' as const, required: true },
      b: { type: 'integer' as const, required: true },
    }
    const result = safeParse(rules, {})
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.a[0].code).toBe(ErrorCode.REQUIRED)
      expect(result.errors.b[0].code).toBe(ErrorCode.REQUIRED)
    }
  })
})

describe('default', () => {
  test('default value does not mutate input', () => {
    const input: Record<string, unknown> = {}
    safeParse({ name: { type: 'string', default: 'Bob' } }, input, opts)
    expect(input.name).toBeUndefined()
  })

  test('default value not applied when field present', () => {
    const input: Record<string, unknown> = { name: 'Alice' }
    safeParse({ name: { type: 'string', default: 'Bob' } }, input, opts)
    expect(input.name).toBe('Alice')
  })

  test('default with required - default fills in so required passes', () => {
    const input: Record<string, unknown> = {}
    const data = parse(
      { name: { type: 'string' as const, required: true, default: 'Bob' } },
      input,
      opts,
    )
    expect(input.name).toBeUndefined()
    expect(data.name).toBe('Bob')
  })

  test('default value of null passes validation', () => {
    expect(passes({ val: { type: ['string', 'null'], default: null } }, {})).toBe(true)
  })

  test('default value of 0 passes validation', () => {
    expect(passes({ val: { type: 'integer', default: 0 } }, {})).toBe(true)
  })

  test('default value of empty string passes validation', () => {
    expect(passes({ val: { type: 'string', default: '' } }, {})).toBe(true)
  })

  test('default value is still validated', () => {
    expect(passes({ val: { type: 'integer', default: 'not_a_number' } }, {})).toBe(false)
  })
})
