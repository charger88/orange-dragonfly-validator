import validate from '../src/index'
import { ODVException } from '../src/index'

describe('exception mode', () => {
  test('exception mode true (default) throws on failure', () => {
    expect(() => {
      validate({ val: { type: 'string' } }, { val: 123 })
    }).toThrow('Validation failed')
  })

  test('exception mode true throws ODVException with info', () => {
    try {
      validate({ val: { type: 'string' } }, { val: 123 })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).message).toBe('Validation failed')
      expect((e as ODVException).info).toBeDefined()
      expect((e as ODVException).info.val).toBeDefined()
      expect((e as ODVException).info.val.length).toBeGreaterThan(0)
    }
  })

  test('exception mode false returns false on failure', () => {
    const result = validate({ val: { type: 'string' } }, { val: 123 }, { exception: false })
    expect(result).toBe(false)
  })

  test('exception mode false returns true on success', () => {
    const result = validate({ val: { type: 'string' } }, { val: 'hello' }, { exception: false, strict: false })
    expect(result).toBeTruthy()
  })

  test('exception mode true does not throw on success', () => {
    expect(() => {
      validate({ val: { type: 'string' } }, { val: 'hello' }, { strict: false })
    }).not.toThrow()
  })
})

describe('errors_prefix', () => {
  test('errors_prefix prepends to error keys', () => {
    try {
      validate({ val: { type: 'string', required: true } }, {}, { errors_prefix: 'form.' })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info['form.val']).toEqual(['Parameter required'])
    }
  })

  test('errors_prefix with nested children', () => {
    try {
      validate(
        { user: { type: 'object' as const, children: { name: { type: 'string' as const, required: true } } } },
        { user: {} },
        { errors_prefix: 'input.' },
      )
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info['input.user.name']).toEqual(['Parameter required'])
    }
  })

  test('empty errors_prefix (default)', () => {
    try {
      validate({ val: { type: 'string', required: true } }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info.val).toEqual(['Parameter required'])
    }
  })
})

describe('errorsPrefix', () => {
  test('errorsPrefix prepends to error keys', () => {
    try {
      validate({ val: { type: 'string', required: true } }, {}, { errorsPrefix: 'form.' })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info['form.val']).toEqual(['Parameter required'])
    }
  })

  test('errorsPrefix with nested children', () => {
    try {
      validate(
        { user: { type: 'object' as const, children: { name: { type: 'string' as const, required: true } } } },
        { user: {} },
        { errorsPrefix: 'input.' },
      )
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info['input.user.name']).toEqual(['Parameter required'])
    }
  })

  test('empty errorsPrefix (default)', () => {
    try {
      validate({ val: { type: 'string', required: true } }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info.val).toEqual(['Parameter required'])
    }
  })
})

describe('multiple errors on same field', () => {
  test('type error stops further checks (early return)', () => {
    try {
      validate({ val: { type: 'string', min: 5, pattern: /^[a-z]+$/ } }, { val: 123 })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info.val.length).toBe(1)
      expect((e as ODVException).info.val[0]).toContain('Incorrect type')
    }
  })

  test('multiple constraint violations reported together', () => {
    try {
      validate({ val: { type: 'string', min: 100, pattern: /^[0-9]+$/ } }, { val: 'abc' })
      throw new Error('Should have thrown')
    } catch (e) {
      expect((e as ODVException).info.val.length).toBe(2)
    }
  })
})

describe('multiple fields with errors', () => {
  test('errors reported for all invalid fields', () => {
    try {
      validate({
        a: { type: 'string', required: true },
        b: { type: 'integer', required: true },
        c: { type: 'boolean', required: true },
      }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      expect(Object.keys((e as ODVException).info).length).toBe(3)
      expect((e as ODVException).info.a).toBeDefined()
      expect((e as ODVException).info.b).toBeDefined()
      expect((e as ODVException).info.c).toBeDefined()
    }
  })
})

describe('return value on success', () => {
  test('returns true in non-exception mode on success', () => {
    expect(validate({ val: { type: 'string' } }, { val: 'ok' }, { exception: false, strict: false })).toBeTruthy()
  })
})
