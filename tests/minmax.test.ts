import { safeParse, ErrorCode } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('min/max for integers', () => {
  test('integer at min passes', () => {
    expect(passes({ val: { type: 'integer', min: 5 } }, { val: 5 })).toBe(true)
  })

  test('integer above min passes', () => {
    expect(passes({ val: { type: 'integer', min: 5 } }, { val: 10 })).toBe(true)
  })

  test('integer below min fails', () => {
    expect(passes({ val: { type: 'integer', min: 5 } }, { val: 3 })).toBe(false)
  })

  test('integer at max passes', () => {
    expect(passes({ val: { type: 'integer', max: 10 } }, { val: 10 })).toBe(true)
  })

  test('integer above max fails', () => {
    expect(passes({ val: { type: 'integer', max: 10 } }, { val: 15 })).toBe(false)
  })

  test('integer within range passes', () => {
    expect(passes({ val: { type: 'integer', min: 1, max: 10 } }, { val: 5 })).toBe(true)
  })

  test('negative integer with min', () => {
    expect(passes({ val: { type: 'integer', min: -10 } }, { val: -5 })).toBe(true)
    expect(passes({ val: { type: 'integer', min: -10 } }, { val: -15 })).toBe(false)
  })

  test('zero as boundary', () => {
    expect(passes({ val: { type: 'integer', min: 0 } }, { val: 0 })).toBe(true)
    expect(passes({ val: { type: 'integer', min: 0 } }, { val: -1 })).toBe(false)
  })
})

describe('min/max for numbers (floats)', () => {
  test('float at min passes', () => {
    expect(passes({ val: { type: 'number', min: 1 } }, { val: 1.0 })).toBe(true)
  })

  test('float above min passes', () => {
    expect(passes({ val: { type: 'number', min: 1 } }, { val: 1.5 })).toBe(true)
  })

  test('float below min fails', () => {
    expect(passes({ val: { type: 'number', min: 1 } }, { val: 0.5 })).toBe(false)
  })

  test('integer passes number type (number includes integer)', () => {
    expect(passes({ val: { type: 'number', min: 1 } }, { val: 5 })).toBe(true)
  })
})

describe('min/max for strings (length)', () => {
  test('string length at min passes', () => {
    expect(passes({ val: { type: 'string', min: 3 } }, { val: 'abc' })).toBe(true)
  })

  test('string length below min fails', () => {
    expect(passes({ val: { type: 'string', min: 3 } }, { val: 'ab' })).toBe(false)
  })

  test('string length at max passes', () => {
    expect(passes({ val: { type: 'string', max: 5 } }, { val: 'abcde' })).toBe(true)
  })

  test('string length above max fails', () => {
    expect(passes({ val: { type: 'string', max: 5 } }, { val: 'abcdef' })).toBe(false)
  })

  test('empty string with min 0', () => {
    expect(passes({ val: { type: 'string', min: 0 } }, { val: '' })).toBe(true)
  })

  test('empty string with min 1 fails', () => {
    expect(passes({ val: { type: 'string', min: 1 } }, { val: '' })).toBe(false)
  })
})

describe('min/max for arrays (length)', () => {
  test('array length at min passes', () => {
    expect(passes({ val: { type: 'array', min: 2 } }, { val: [1, 2] })).toBe(true)
  })

  test('array length below min fails', () => {
    expect(passes({ val: { type: 'array', min: 2 } }, { val: [1] })).toBe(false)
  })

  test('array length at max passes', () => {
    expect(passes({ val: { type: 'array', max: 3 } }, { val: [1, 2, 3] })).toBe(true)
  })

  test('array length above max fails', () => {
    expect(passes({ val: { type: 'array', max: 3 } }, { val: [1, 2, 3, 4] })).toBe(false)
  })

  test('empty array with min 0', () => {
    expect(passes({ val: { type: 'array', min: 0 } }, { val: [] })).toBe(true)
  })
})

describe('min/max error messages', () => {
  test('min error includes expected and actual', () => {
    const result = safeParse({ val: { type: 'integer', min: 10 } }, { val: 5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.MIN_VIOLATION)
      expect(result.errors.val[0].params?.min).toBe(10)
      expect(result.errors.val[0].params?.actual).toBe(5)
    }
  })

  test('max error includes expected and actual', () => {
    const result = safeParse({ val: { type: 'string', max: 3 } }, { val: 'abcde' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.MAX_VIOLATION)
      expect(result.errors.val[0].params?.max).toBe(3)
      expect(result.errors.val[0].params?.actual).toBe(5)
    }
  })
})

describe('min/max with null value', () => {
  test('null value skips min/max check', () => {
    expect(passes({ val: { type: ['null', 'integer'], min: 5 } }, { val: null })).toBe(true)
  })
})
