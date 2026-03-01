import { parse, safeParse, validateSchema, ODValidatorException, ODValidatorRulesException, ODValidatorSecurityException } from '../src/index'
import type { ODValidatorRulesSchema, ODValidatorRuleSchema } from '../src/index'

const opts = { strictMode: false } as const

describe('parse', () => {
  test('parse returns validated data on success', () => {
    const result = parse({ name: { type: 'string' as const } }, { name: 'Alice' }, opts)
    expect(result.name).toBe('Alice')
  })

  test('parse throws when a rule definition is not an object', () => {
    expect(() => {
      parse({ name: true as unknown as ODValidatorRuleSchema }, { name: 'Alice' }, opts)
    }).toThrow(ODValidatorRulesException)
  })

  test('parse throws on validation failure', () => {
    expect(() => {
      parse({ name: { type: 'string' as const, required: true } }, {}, opts)
    }).toThrow(ODValidatorException)
  })

  test('parse applies defaults in returned data', () => {
    const result = parse(
      { name: { type: 'string' as const, default: 'Bob' } },
      {},
      opts,
    )
    expect(result.name).toBe('Bob')
  })

  test('parse applies transform with apply_transformed', () => {
    const result = parse(
      { val: { type: 'integer' as const, transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } },
      { val: '42' },
      opts,
    )
    expect(result.val).toBe(42)
  })

  test('parse does not mutate original input', () => {
    const input = { val: '42' }
    parse(
      { val: { type: 'integer' as const, transform: (v: unknown) => parseInt(v as string, 10), apply_transformed: true } },
      input,
      opts,
    )
    expect(input.val).toBe('42')
  })

  test('parse with strict mode', () => {
    expect(() => {
      parse({ name: { type: 'string' as const } }, { name: 'Alice', extra: 'bad' })
    }).toThrow()
  })

  test('parse with strict mode off allows extra keys', () => {
    const result = parse(
      { name: { type: 'string' as const } },
      { name: 'Alice', extra: 'ok' },
      { strictMode: false },
    )
    expect(result.name).toBe('Alice')
  })

  test('parse with nested objects', () => {
    const result = parse(
      {
        user: {
          type: 'object' as const,
          children: {
            name: { type: 'string' as const, required: true },
          },
        },
      },
      { user: { name: 'Alice' } },
      opts,
    )
    expect(result.user).toBeDefined()
  })
})

describe('safeParse', () => {
  test('safeParse returns success with data on valid input', () => {
    const result = safeParse({ name: { type: 'string' as const } }, { name: 'Alice' }, opts)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
    }
  })

  test('safeParse returns failure with errors on invalid input', () => {
    const result = safeParse({ name: { type: 'string' as const, required: true } }, {}, opts)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name).toBeDefined()
      expect(result.errors.name[0].code).toBe('REQUIRED')
    }
  })

  test('safeParse never throws for validation errors', () => {
    expect(() => {
      safeParse({ val: { type: 'string' as const } }, { val: 123 }, opts)
    }).not.toThrow()
  })

  test('safeParse still throws for rules errors', () => {
    expect(() => {
      safeParse({ val: { type: 'invalid_type' as 'string' } }, { val: 'test' }, opts)
    }).toThrow(ODValidatorRulesException)
  })

  test('safeParse applies defaults in returned data', () => {
    const result = safeParse(
      { name: { type: 'string' as const, default: 'Bob' } },
      {},
      opts,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Bob')
    }
  })

  test('safeParse rejects NaN when finite constraints are present without explicit type', () => {
    const result = safeParse({ value: { min: 1 } }, { value: NaN }, opts)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.value[0].code).toBe('TYPE_MISMATCH')
    }
  })

  test('safeParse rejects Infinity when finite constraints are present without explicit type', () => {
    const result = safeParse({ value: { in: [1, 2, 3] } }, { value: Infinity }, opts)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.value[0].code).toBe('TYPE_MISMATCH')
    }
  })
})

describe('parse with arrays', () => {
  test('parse returns array data that is usable as array', () => {
    const result = parse(
      { 'some-array': { type: 'array' as const, required: true } },
      { 'some-array': ['one', 'two', 'three'] },
      opts,
    )
    expect(Array.isArray(result['some-array'])).toBe(true)
    expect(result['some-array']).toEqual(['one', 'two', 'three'])
    expect(result['some-array'].length).toBe(3)
    expect(result['some-array'].reverse()).toEqual(['three', 'two', 'one'])
  })

  test('parse validates array children with * wildcard', () => {
    const result = parse(
      {
        'my-array': {
          type: 'array' as const,
          required: true,
          children: {
            '*': { type: 'string' as const },
          },
        },
      },
      { 'my-array': ['a', 'b', 'c'] },
      opts,
    )
    expect(Array.isArray(result['my-array'])).toBe(true)
    expect(result['my-array']).toEqual(['a', 'b', 'c'])
  })

  test('parse throws when array children type mismatches', () => {
    expect(() => {
      parse(
        {
          'my-array': {
            type: 'array' as const,
            required: true,
            children: {
              '*': { type: 'integer' as const },
            },
          },
        },
        { 'my-array': ['not', 'integers'] },
      )
    }).toThrow(ODValidatorException)
  })

  test('parse validates array with min/max constraints', () => {
    const result = parse(
      {
        'some-array': {
          type: 'array' as const,
          required: true,
          min: 1,
          max: 5,
        },
      },
      { 'some-array': [1, 2, 3] },
      opts,
    )
    expect(result['some-array'].length).toBe(3)
  })

  test('parse throws when array length below min', () => {
    expect(() => {
      parse(
        {
          'some-array': {
            type: 'array' as const,
            required: true,
            min: 5,
          },
        },
        { 'some-array': [1, 2] },
      )
    }).toThrow(ODValidatorException)
  })

  test('parse throws when array length above max', () => {
    expect(() => {
      parse(
        {
          'some-array': {
            type: 'array' as const,
            required: true,
            max: 2,
          },
        },
        { 'some-array': [1, 2, 3, 4] },
      )
    }).toThrow(ODValidatorException)
  })

  test('parse with empty array', () => {
    const result = parse(
      { 'my-array': { type: 'array' as const, required: true } },
      { 'my-array': [] },
      opts,
    )
    expect(result['my-array']).toEqual([])
    expect(result['my-array'].length).toBe(0)
  })

  test('safeParse returns array data on success', () => {
    const result = safeParse(
      {
        'some-array': {
          type: 'array' as const,
          required: true,
          children: {
            '*': { type: 'string' as const },
          },
        },
      },
      { 'some-array': ['one', 'two', 'three'] },
      opts,
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(Array.isArray(result.data['some-array'])).toBe(true)
      expect(result.data['some-array']).toEqual(['one', 'two', 'three'])
    }
  })

  test('safeParse returns failure for invalid array children', () => {
    const result = safeParse(
      {
        'my-array': {
          type: 'array' as const,
          required: true,
          children: {
            '*': { type: 'string' as const },
          },
        },
      },
      { 'my-array': ['ok', 42, 'fine'] },
      opts,
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors['my-array.1']).toBeDefined()
    }
  })

  test('parse with array alongside other fields (like example)', () => {
    const result = parse(
      {
        'my-string': { type: 'string' as const, required: true },
        'some-array': {
          type: ['array'] as const,
          required: true,
          min: 1,
          max: 10,
          children: {
            '*': { type: ['string'] as const },
          },
        },
      },
      {
        'my-string': 'Ho-ho-ho',
        'some-array': ['one', 'two', 'three'],
      },
      opts,
    )
    expect(result['my-string'].length).toBe(8)
    expect(Array.isArray(result['some-array'])).toBe(true)
    expect(result['some-array'].reverse()).toEqual(['three', 'two', 'one'])
  })
})

describe('validateSchema', () => {
  test('validateSchema accepts valid schema', () => {
    const schema = validateSchema({
      name: { type: ['string'], required: true },
      age: { type: ['integer'], min: 0 },
    })
    expect(schema).toBeDefined()
  })

  test('validateSchema throws on invalid schema', () => {
    expect(() => {
      validateSchema({ val: { type: 'invalid' } })
    }).toThrow()
  })

  test('validateSchema rejects non-object @ options', () => {
    expect(() => {
      validateSchema({ '@': true as unknown as Record<string, unknown>, val: { type: ['string'] } })
    }).toThrow(ODValidatorRulesException)
  })
})

describe('safeParse - non-ODValidatorException rethrow (line 53)', () => {
  test('safeParse rethrows errors that are not ODValidatorException instances', () => {
    // A transform that throws a plain Error (not ODValidatorException) is rethrown by safeParse
    const schema = {
      val: { transform: () => { throw new Error('unexpected internal error') } },
    } as unknown as ODValidatorRulesSchema
    expect(() => safeParse(schema, { val: 'test' }, { strictMode: false })).toThrow('unexpected internal error')
  })

  test('safeParse rethrows security exceptions', () => {
    const schema = { name: { type: 'string' as const } }
    const maliciousInput = JSON.parse('{"name":"Alice","__proto__":{"polluted":true}}')
    expect(() => safeParse(schema, maliciousInput, opts)).toThrow(ODValidatorSecurityException)
  })
})

describe('validateSchema - recursive child and @ key handling', () => {
  // Note: validateSchema validates the raw (non-normalized) schema.
  // RULES_SCHEMA requires type to be an array, so we use array types here.

  test('validateSchema skips @ meta-key without error (line 70)', () => {
    expect(() => {
      validateSchema({ '@': { strict: false }, name: { type: ['string'] } })
    }).not.toThrow()
  })

  test('validateSchema recursively validates children schemas (line 73)', () => {
    expect(() => {
      validateSchema({
        user: {
          type: ['object'],
          children: {
            name: { type: ['string'], required: true },
            age: { type: ['integer'] },
          },
        },
      })
    }).not.toThrow()
  })

  test('validateSchema throws for invalid rules inside children', () => {
    expect(() => {
      validateSchema({
        user: {
          type: ['object'],
          children: {
            name: { type: ['totally_invalid_type'] } as unknown as ODValidatorRuleSchema,
          },
        },
      })
    }).toThrow(ODValidatorRulesException)
  })
})
