import {
  safeParse,
  isSafeKey,
  ODValidatorRules,
  ODValidator,
  fromJsonSchema,
  validateSchema,
  ODValidatorSchemaBuilder,
  ODValidatorSecurityException,
} from '../src/index'

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
  test('__proto__ in input throws a security exception', () => {
    const schema = { name: { type: 'string' as const } }
    const maliciousInput = JSON.parse('{"name":"Alice","__proto__":{"polluted":true}}')
    expect(() => safeParse(schema, maliciousInput, opts)).toThrow(ODValidatorSecurityException)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('constructor in input throws a security exception', () => {
    const schema = { name: { type: 'string' as const } }
    const input = { name: 'Alice', constructor: { prototype: { polluted: true } } }
    expect(() => safeParse(schema, input as Record<string, unknown>, opts)).toThrow(ODValidatorSecurityException)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('__proto__ key in input is rejected before wildcard processing', () => {
    const schema = {
      '@': { strict: false },
      '*': { type: 'string' as const },
    }
    const maliciousInput = JSON.parse('{"safe":"hello","__proto__":{"evil":true}}')
    expect(() => safeParse(schema, maliciousInput, opts)).toThrow(ODValidatorSecurityException)
  })
})

describe('prototype pollution via error collection', () => {
  test('strict mode still throws a security exception for __proto__ keys', () => {
    const validator = new ODValidator(
      new ODValidatorRules({ name: { type: 'string' as const } }),
      { exceptionMode: false },
    )
    const maliciousInput = JSON.parse('{"name":"Alice","__proto__":{"polluted":true}}')
    expect(() => validator.validate(maliciousInput)).toThrow(ODValidatorSecurityException)
    expect(Object.getPrototypeOf(validator.errors)).toBe(Object.prototype)
    expect(Object.keys(validator.errors)).toEqual([])
  })
})

describe('prototype pollution via schema keys', () => {
  test('__proto__ as a schema rule key throws a security exception', () => {
    const schema = JSON.parse('{"name":{"type":"string","required":true},"__proto__":{"type":"string","required":true}}')
    expect(() => safeParse(schema, { name: 'Alice' }, opts)).toThrow(ODValidatorSecurityException)
  })

  test('constructor as a schema rule key throws a security exception', () => {
    const schema = { name: { type: 'string' as const }, constructor: { type: 'string' as const, required: true } }
    expect(() => safeParse(schema as Record<string, unknown>, { name: 'Alice' }, opts)).toThrow(ODValidatorSecurityException)
  })

  test('ODValidatorRules normalization throws for __proto__ schema keys', () => {
    const schema = JSON.parse('{"name":{"type":"string"},"__proto__":{"type":"string","required":true}}')
    expect(() => new ODValidatorRules(schema)).toThrow(ODValidatorSecurityException)
  })

  test('fromJsonSchema throws for __proto__ properties', () => {
    const jsonSchema = JSON.parse('{"type":"object","properties":{"name":{"type":"string"},"__proto__":{"type":"string"}}}')
    expect(() => fromJsonSchema(jsonSchema)).toThrow(ODValidatorSecurityException)
  })

  test('validateSchema throws for poisoned schema keys', () => {
    const schema = JSON.parse('{"name":{"type":["string"]},"__proto__":{"type":["string"]}}')
    expect(() => validateSchema(schema)).toThrow(ODValidatorSecurityException)
  })

  test('schema builder throws for poisoned property names', () => {
    expect(() => {
      new ODValidatorSchemaBuilder().property('__proto__', p => p.string())
    }).toThrow(ODValidatorSecurityException)
  })
})

describe('prototype pollution via wildcard on poisoned input keys', () => {
  test('wildcard * still rejects __proto__ keys in objects', () => {
    const schema = {
      '@': { strict: false },
      '*': { type: 'string' as const },
    }
    const maliciousInput = JSON.parse('{"safe":"hello","__proto__":{"polluted":true}}')
    expect(() => safeParse(schema, maliciousInput, opts)).toThrow(ODValidatorSecurityException)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })

  test('key validator # still rejects __proto__ keys', () => {
    const schema = {
      '@': { strict: false },
      '#': { type: 'string' as const, min: 1 },
    }
    const maliciousInput = JSON.parse('{"safe":"hello","__proto__":{"polluted":true}}')
    expect(() => safeParse(schema, maliciousInput, opts)).toThrow(ODValidatorSecurityException)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('prototype pollution via nested children', () => {
  test('__proto__ in nested object children throws a security exception', () => {
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
    expect(() => safeParse(schema, maliciousInput, opts)).toThrow(ODValidatorSecurityException)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})
