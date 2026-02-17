import { parse, safeParse } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('in - allowed values', () => {
  test('value in allowed list passes', () => {
    expect(passes({ val: { type: 'string', in: ['a', 'b', 'c'] } }, { val: 'a' })).toBe(true)
  })

  test('value not in allowed list fails', () => {
    expect(passes({ val: { type: 'string', in: ['a', 'b', 'c'] } }, { val: 'd' })).toBe(false)
  })

  test('integer in allowed list', () => {
    expect(passes({ val: { type: 'integer', in: [1, 2, 3] } }, { val: 2 })).toBe(true)
    expect(passes({ val: { type: 'integer', in: [1, 2, 3] } }, { val: 4 })).toBe(false)
  })

  test('boolean in allowed list', () => {
    expect(passes({ val: { type: 'boolean', in: [true] } }, { val: true })).toBe(true)
    expect(passes({ val: { type: 'boolean', in: [true] } }, { val: false })).toBe(false)
  })

  test('null in allowed list', () => {
    expect(passes({ val: { type: ['null', 'string'], in: [null, 'a'] } }, { val: null })).toBe(true)
  })
})

describe('in with arrays - checks array elements', () => {
  test('all array elements in allowed list passes', () => {
    expect(passes({ val: { type: 'array', in: ['a', 'b', 'c'] } }, { val: ['a', 'b'] })).toBe(true)
  })

  test('some array elements not in allowed list fails', () => {
    expect(passes({ val: { type: 'array', in: ['a', 'b', 'c'] } }, { val: ['a', 'd'] })).toBe(false)
  })

  test('empty array passes in check', () => {
    expect(passes({ val: { type: 'array', in: ['a', 'b'] } }, { val: [] })).toBe(true)
  })
})

describe('in:public - error message exposure', () => {
  test('without in:public, error does not list values', () => {
    const result = safeParse({ val: { type: 'string', in: ['a', 'b'] } }, { val: 'z' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Provided value is not allowed')
      expect(result.errors.val[0].message).not.toContain('Allowed values')
    }
  })

  test('with in:public true, error lists allowed values', () => {
    const result = safeParse({ val: { type: 'string', in: ['a', 'b'], 'in:public': true } }, { val: 'z' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toContain('a')
      expect(result.errors.val[0].message).toContain('b')
    }
  })

  test('with in:public as array, error lists custom values', () => {
    const result = safeParse({ val: { type: 'string', in: ['a', 'b', 'deprecated_c'], 'in:public': ['a', 'b'] } }, { val: 'z' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toContain('a')
      expect(result.errors.val[0].message).toContain('b')
      expect(result.errors.val[0].message).not.toContain('deprecated_c')
    }
  })

  test('in:public with array type shows values in error', () => {
    const result = safeParse({ val: { type: 'array', in: ['x', 'y'], 'in:public': true } }, { val: ['z'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toContain('x')
      expect(result.errors.val[0].message).toContain('y')
    }
  })
})

describe('in with objects throws rules error', () => {
  test('in directive on object type throws rules error', () => {
    expect(() => {
      parse({ val: { type: 'object', in: [{}] } }, { val: {} })
    }).toThrow()
  })
})
