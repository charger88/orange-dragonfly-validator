import { safeParse, ErrorCode } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('children - nested object validation', () => {
  test('valid nested object passes', () => {
    const rules = {
      user: {
        type: 'object' as const,
        children: {
          name: { type: 'string' as const, required: true },
          age: { type: 'integer' as const },
        },
      },
    }
    expect(passes(rules, { user: { name: 'Alice', age: 30 } })).toBe(true)
  })

  test('invalid nested object fails', () => {
    const rules = {
      user: {
        type: 'object' as const,
        children: {
          name: { type: 'string' as const, required: true },
        },
      },
    }
    expect(passes(rules, { user: {} })).toBe(false)
  })

  test('nested error keys have dot notation', () => {
    const rules = {
      user: {
        type: 'object' as const,
        children: {
          name: { type: 'string' as const, required: true },
        },
      },
    }
    const result = safeParse(rules, { user: {} })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors['user.name']).toBeDefined()
      expect(result.errors['user.name'][0].code).toBe(ErrorCode.REQUIRED)
    }
  })

  test('deeply nested objects', () => {
    const rules = {
      a: {
        type: 'object' as const,
        children: {
          b: {
            type: 'object' as const,
            children: {
              c: { type: 'string' as const, required: true },
            },
          },
        },
      },
    }
    expect(passes(rules, { a: { b: { c: 'deep' } } })).toBe(true)
    expect(passes(rules, { a: { b: {} } })).toBe(false)
  })

  test('deeply nested error keys', () => {
    const rules = {
      a: {
        type: 'object' as const,
        children: {
          b: {
            type: 'object' as const,
            children: {
              c: { type: 'string' as const, required: true },
            },
          },
        },
      },
    }
    const result = safeParse(rules, { a: { b: {} } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors['a.b.c']).toBeDefined()
      expect(result.errors['a.b.c'][0].code).toBe(ErrorCode.REQUIRED)
    }
  })
})

describe('children - array validation with * wildcard', () => {
  test('array elements validated with * rule', () => {
    const rules = {
      tags: {
        type: 'array' as const,
        children: {
          '*': { type: 'string' as const },
        },
      },
    }
    expect(passes(rules, { tags: ['a', 'b', 'c'] })).toBe(true)
  })

  test('array with invalid element fails', () => {
    const rules = {
      tags: {
        type: 'array' as const,
        children: {
          '*': { type: 'string' as const },
        },
      },
    }
    expect(passes(rules, { tags: ['a', 123, 'c'] })).toBe(false)
  })

  test('array element errors have index in key', () => {
    const rules = {
      tags: {
        type: 'array' as const,
        children: {
          '*': { type: 'string' as const },
        },
      },
    }
    const result = safeParse(rules, { tags: ['ok', 42] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors['tags.1']).toBeDefined()
    }
  })

  test('empty array passes', () => {
    const rules = {
      items: {
        type: 'array' as const,
        children: {
          '*': { type: 'integer' as const, min: 0 },
        },
      },
    }
    expect(passes(rules, { items: [] })).toBe(true)
  })
})

describe('children - object with * wildcard for all values', () => {
  test('all object values validated with *', () => {
    const rules = {
      scores: {
        type: 'object' as const,
        children: {
          '@': { strict: false },
          '*': { type: 'integer' as const, min: 0, max: 100 },
        },
      },
    }
    expect(passes(rules, { scores: { math: 90, english: 85 } })).toBe(true)
    expect(passes(rules, { scores: { math: 90, english: 150 } })).toBe(false)
  })
})

describe('children - # key validation', () => {
  test('object keys validated with # rule', () => {
    const rules = {
      data: {
        type: 'object' as const,
        children: {
          '@': { strict: false },
          '#': { type: 'string' as const, pattern: /^[a-z_]+$/ },
          '*': { type: 'integer' as const },
        },
      },
    }
    expect(passes(rules, { data: { valid_key: 1 } })).toBe(true)
    expect(passes(rules, { data: { 'INVALID-KEY': 1 } })).toBe(false)
  })

  test('key validation error has #key suffix', () => {
    const rules = {
      data: {
        type: 'object' as const,
        children: {
          '@': { strict: false },
          '#': { type: 'string' as const, pattern: /^[a-z]+$/ },
          '*': { type: 'integer' as const },
        },
      },
    }
    const result = safeParse(rules, { data: { UPPER: 1 } })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors['data.UPPER#key']).toBeDefined()
    }
  })
})

describe('# and * at root level', () => {
  test('root * validates all top-level values', () => {
    const rules = {
      '@': { strict: false },
      '*': { type: 'string' as const },
    }
    expect(passes(rules, { a: 'hello', b: 'world' })).toBe(true)
    expect(passes(rules, { a: 'hello', b: 123 })).toBe(false)
  })

  test('root # validates all top-level keys', () => {
    const rules = {
      '@': { strict: false },
      '#': { type: 'string' as const, pattern: /^[a-z]+$/ },
      '*': { type: 'string' as const },
    }
    expect(passes(rules, { hello: 'world' })).toBe(true)
    expect(passes(rules, { 'BAD-KEY': 'world' })).toBe(false)
  })
})

describe('children - combined named keys and wildcards', () => {
  test('named key and * wildcard coexist', () => {
    const rules = {
      config: {
        type: 'object' as const,
        children: {
          '@': { strict: false },
          name: { type: 'string' as const, required: true },
          '*': { type: ['string', 'integer'] as const },
        },
      },
    }
    expect(passes(rules, { config: { name: 'test', extra: 'val' } })).toBe(true)
    expect(passes(rules, { config: { extra: 'val' } })).toBe(false)
  })
})
