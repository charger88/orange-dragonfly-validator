import { parse, safeParse, ODVRulesException } from '../src/index'

describe('invalid rules detection', () => {
  test('invalid type value in rule throws', () => {
    expect(() => {
      parse({ val: { type: 'invalid_type' as 'string' } }, { val: 'test' })
    }).toThrow()
  })

  test('min as non-integer throws', () => {
    expect(() => {
      parse({ val: { type: 'string', min: 'five' as unknown as number } }, { val: 'test' })
    }).toThrow()
  })

  test('max as non-integer throws', () => {
    expect(() => {
      parse({ val: { type: 'string', max: 'ten' as unknown as number } }, { val: 'test' })
    }).toThrow()
  })

  test('required as non-boolean throws', () => {
    expect(() => {
      parse({ val: { type: 'string', required: 'yes' as unknown as boolean } }, { val: 'test' })
    }).toThrow()
  })

  test('in as non-array throws', () => {
    expect(() => {
      parse({ val: { type: 'string', in: 'a' as unknown as unknown[] } }, { val: 'test' })
    }).toThrow()
  })

  test('type as invalid in array throws', () => {
    expect(() => {
      parse({ val: { type: ['string', 'foobar'] as unknown as 'string'[] } }, { val: 'test' })
    }).toThrow()
  })

  test('valid rules do not throw', () => {
    expect(() => {
      parse({ val: { type: 'string', min: 1, max: 10, required: true, pattern: /^.+$/ } }, { val: 'test' })
    }).not.toThrow()
  })
})

describe('rules error is distinguishable from validation error', () => {
  test('rules error message differs from validation error', () => {
    try {
      parse({ val: { type: 'invalid_type' as 'string' } }, { val: 'test' })
      throw new Error('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ODVRulesException)
      expect((e as Error).message).toContain('Validation rules')
    }
  })

  test('validation error message says Validation failed', () => {
    try {
      parse({ val: { type: 'string' } }, { val: 123 })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as Error).message).toBe('Validation failed')
    }
  })
})

describe('min/max on incompatible types', () => {
  test('min/max on boolean-only type throws rules error', () => {
    expect(() => {
      parse({ val: { type: 'boolean', min: 0 } }, { val: true })
    }).toThrow()
  })

  test('min/max on multi-type with incompatible type does not throw if compatible type also present', () => {
    expect(() => {
      safeParse({ val: { type: ['string', 'boolean'], min: 0 } }, { val: true }, { strictMode: false })
    }).not.toThrow()
  })
})

describe('@ options validation', () => {
  test('invalid @ option throws', () => {
    expect(() => {
      parse({ '@': { strict: 'yes' as unknown as boolean }, val: { type: 'string' } }, { val: 'test' })
    }).toThrow()
  })
})
