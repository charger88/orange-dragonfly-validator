import { ODValidatorException, parse, safeParse } from '../src/index'

describe('exception mode', () => {
  test('exception mode true (default) throws on failure', () => {
    expect(() => {
      parse({ val: { type: 'string' } }, { val: 123 })
    }).toThrow('Validation failed')
  })

  test('exception mode true throws ODValidatorException with info', () => {
    try {
      parse({ val: { type: 'string' } }, { val: 123 })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).message).toBe('Validation failed')
      expect((e as ODValidatorException).info).toBeDefined()
      expect((e as ODValidatorException).info.val).toBeDefined()
      expect((e as ODValidatorException).info.val.length).toBeGreaterThan(0)
    }
  })

  test('exception mode false returns false on failure', () => {
    const {success} = safeParse({ val: { type: 'string' } }, { val: 123 })
    expect(success).toBe(false)
  })

  test('exception mode false returns true on success', () => {
    const {success} = safeParse({ val: { type: 'string' } }, { val: 'hello' }, { strictMode: false })
    expect(success).toBe(true)
  })

  test('exception mode true does not throw on success', () => {
    expect(() => {
      parse({ val: { type: 'string' } }, { val: 'hello' }, { strictMode: false })
    }).not.toThrow()
  })
})

describe('errors_prefix', () => {
  test('errors_prefix prepends to error keys', () => {
    try {
      parse({ val: { type: 'string', required: true } }, {}, {}, 'form.')
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info['form.val']).toEqual(['Parameter required'])
    }
  })

  test('errors_prefix with nested children', () => {
    try {
      parse(
        { user: { type: 'object' as const, children: { name: { type: 'string' as const, required: true } } } },
        { user: {} },
        {},
        'input.',
      )
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info['input.user.name']).toEqual(['Parameter required'])
    }
  })

  test('empty errors_prefix (default)', () => {
    try {
      parse({ val: { type: 'string', required: true } }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info.val).toEqual(['Parameter required'])
    }
  })
})

describe('errorsPrefix', () => {
  test('errorsPrefix prepends to error keys', () => {
    try {
      parse({ val: { type: 'string', required: true } }, {}, {}, 'form.')
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info['form.val']).toEqual(['Parameter required'])
    }
  })

  test('errorsPrefix with nested children', () => {
    try {
      parse(
        { user: { type: 'object' as const, children: { name: { type: 'string' as const, required: true } } } },
        { user: {} },
        {},
        'input.',
      )
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info['input.user.name']).toEqual(['Parameter required'])
    }
  })

  test('empty errorsPrefix (default)', () => {
    try {
      parse({ val: { type: 'string', required: true } }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info.val).toEqual(['Parameter required'])
    }
  })
})

describe('multiple errors on same field', () => {
  test('type error stops further checks (early return)', () => {
    try {
      parse({ val: { type: 'string', min: 5, pattern: /^[a-z]+$/ } }, { val: 123 })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info.val.length).toBe(1)
      expect((e as ODValidatorException).info.val[0]).toContain('Incorrect type')
    }
  })

  test('multiple constraint violations reported together', () => {
    try {
      parse({ val: { type: 'string', min: 100, pattern: /^[0-9]+$/ } }, { val: 'abc' })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODValidatorException).info.val.length).toBe(2)
    }
  })
})

describe('multiple fields with errors', () => {
  test('errors reported for all invalid fields', () => {
    try {
      parse({
        a: { type: 'string', required: true },
        b: { type: 'integer', required: true },
        c: { type: 'boolean', required: true },
      }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      expect(Object.keys((e as ODValidatorException).info).length).toBe(3)
      expect((e as ODValidatorException).info.a).toBeDefined()
      expect((e as ODValidatorException).info.b).toBeDefined()
      expect((e as ODValidatorException).info.c).toBeDefined()
    }
  })
})

describe('return value on success', () => {
  test('returns true in non-exception mode on success', () => {
    expect(safeParse({ val: { type: 'string' } }, { val: 'ok' }, { strictMode: false })).toBeTruthy()
  })
})
