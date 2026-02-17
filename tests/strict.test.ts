import { safeParse, ErrorCode } from '../src/index'

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>, opts?: Parameters<typeof safeParse>[2]): boolean {
  return safeParse(rules, input, opts).success
}

describe('strict mode - global option', () => {
  test('strict mode rejects unknown keys (default)', () => {
    const rules = { name: { type: 'string' as const } }
    expect(passes(rules, { name: 'Alice', extra: 'field' })).toBe(false)
  })

  test('strict mode rejects unknown keys - error message', () => {
    const rules = { name: { type: 'string' as const } }
    const result = safeParse(rules, { name: 'Alice', extra: 'field' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.extra[0].code).toBe(ErrorCode.NOT_ALLOWED)
      expect(result.errors.extra[0].message).toBe('Parameter not allowed')
    }
  })

  test('strict mode off allows unknown keys', () => {
    const rules = { name: { type: 'string' as const } }
    expect(passes(rules, { name: 'Alice', extra: 'field' }, { strictMode: false })).toBe(true)
  })

  test('strict mode with no extra keys passes', () => {
    const rules = { name: { type: 'string' as const } }
    expect(passes(rules, { name: 'Alice' })).toBe(true)
  })

  test('strict mode with empty input passes', () => {
    const rules = { name: { type: 'string' as const } }
    expect(passes(rules, {})).toBe(true)
  })

  test('multiple unknown keys all reported', () => {
    const rules = { name: { type: 'string' as const } }
    const result = safeParse(rules, { name: 'Alice', foo: 1, bar: 2 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.foo[0].code).toBe(ErrorCode.NOT_ALLOWED)
      expect(result.errors.bar[0].code).toBe(ErrorCode.NOT_ALLOWED)
    }
  })
})

describe('strict mode - @ override in children', () => {
  test('@ strict false allows extra keys in nested object', () => {
    const rules = {
      data: {
        type: 'object' as const,
        children: {
          '@': { strict: false },
          name: { type: 'string' as const },
        },
      },
    }
    expect(passes(rules, { data: { name: 'test', extra: 'ok' } })).toBe(true)
  })

  test('@ strict true rejects extra keys in nested object', () => {
    const rules = {
      data: {
        type: 'object' as const,
        children: {
          '@': { strict: true },
          name: { type: 'string' as const },
        },
      },
    }
    expect(passes(rules, { data: { name: 'test', extra: 'bad' } })).toBe(false)
  })

  test('@ at root level overrides global strict', () => {
    const rules = {
      '@': { strict: false },
      name: { type: 'string' as const },
    }
    expect(passes(rules, { name: 'Alice', extra: 'ok' }, { strictMode: true })).toBe(true)
  })
})
