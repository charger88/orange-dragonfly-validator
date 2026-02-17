import { safeParse, parse, isSafeKey, ODVRules, ODVValidator } from '../src/index'

const opts = { strictMode: false } as const

describe('isSafeKey', () => {
  test('rejects __proto__', () => {
    expect(isSafeKey('__proto__')).toBe(false)
  })

  test('rejects constructor', () => {
    expect(isSafeKey('constructor')).toBe(false)
  })

  test('rejects prototype', () => {
    expect(isSafeKey('prototype')).toBe(false)
  })

  test('accepts normal keys', () => {
    expect(isSafeKey('name')).toBe(true)
    expect(isSafeKey('__data__')).toBe(true)
    expect(isSafeKey('proto')).toBe(true)
  })
})

describe('prototype pollution via input keys', () => {
  test('__proto__ in input does not pollute Object prototype', () => {
    const schema = { name: { type: 'string' as const } }
    const maliciousInput = JSON.parse('{"name":"Alice","__proto__":{"polluted":true}}')
    safeParse(schema, maliciousInput, opts)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('constructor in input does not pollute Object prototype', () => {
    const schema = { name: { type: 'string' as const } }
    const input = { name: 'Alice', constructor: { prototype: { polluted: true } } }
    safeParse(schema, input as Record<string, unknown>, opts)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('__proto__ key in input is not validated or processed by rules', () => {
    // The key survives as an inert own property in the shallow clone,
    // but it is never processed by named rules, wildcards, or strict mode.
    const schema = {
      '@': { strict: false },
      '*': { type: 'string' as const },
    }
    const maliciousInput = JSON.parse('{"safe":"hello","__proto__":{"evil":true}}')
    // Wildcard skips __proto__, so the object value doesn't cause a type error
    const result = safeParse(schema, maliciousInput, opts)
    expect(result.success).toBe(true)
  })
})

describe('prototype pollution via schema keys', () => {
  test('__proto__ as a schema rule key is silently ignored', () => {
    const schema = JSON.parse('{"name":{"type":"string","required":true},"__proto__":{"type":"string","required":true}}')
    const result = safeParse(schema, { name: 'Alice' }, opts)
    // Should pass — __proto__ rule is skipped, so it's not enforced as required
    expect(result.success).toBe(true)
  })

  test('constructor as a schema rule key is silently ignored', () => {
    const schema = { name: { type: 'string' as const }, constructor: { type: 'string' as const, required: true } }
    const result = safeParse(schema as Record<string, unknown>, { name: 'Alice' }, opts)
    expect(result.success).toBe(true)
  })
})

describe('prototype pollution via wildcard on poisoned input keys', () => {
  test('wildcard * does not process __proto__ keys in objects', () => {
    const schema = {
      '@': { strict: false },
      '*': { type: 'string' as const },
    }
    const maliciousInput = JSON.parse('{"safe":"hello","__proto__":{"polluted":true}}')
    safeParse(schema, maliciousInput, opts)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('key validator # does not process __proto__ keys', () => {
    const schema = {
      '@': { strict: false },
      '#': { type: 'string' as const, min: 1 },
    }
    const maliciousInput = JSON.parse('{"safe":"hello","__proto__":{"polluted":true}}')
    const result = safeParse(schema, maliciousInput, opts)
    // Should not error on __proto__ key — it's skipped entirely
    expect(result.success).toBe(true)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('prototype pollution via nested children', () => {
  test('__proto__ in nested object children does not pollute', () => {
    const schema = {
      user: {
        type: 'object' as const,
        children: {
          name: { type: 'string' as const },
        },
      },
    }
    const maliciousInput = {
      user: JSON.parse('{"name":"Alice","__proto__":{"polluted":true}}'),
    }
    safeParse(schema, maliciousInput, opts)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
