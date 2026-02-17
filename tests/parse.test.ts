import { parse, safeParse, validateSchema, ODVException, ODVRulesException } from '../src/index'

const opts = { strictMode: false } as const

describe('parse', () => {
  test('parse returns validated data on success', () => {
    const result = parse({ name: { type: 'string' as const } }, { name: 'Alice' }, opts)
    expect(result.name).toBe('Alice')
  })

  test('parse throws on validation failure', () => {
    expect(() => {
      parse({ name: { type: 'string' as const, required: true } }, {}, opts)
    }).toThrow(ODVException)
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
    }).toThrow(ODVRulesException)
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
    }).toThrow(ODVException)
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
    }).toThrow(ODVException)
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
    }).toThrow(ODVException)
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
})
