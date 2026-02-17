import { parse, safeParse, ODVException, ErrorCode } from '../src/index'

describe('structured error entries', () => {
  test('error entry has code, message, and params', () => {
    const result = safeParse({ val: { type: 'string', required: true } }, {})
    expect(result.success).toBe(false)
    if (!result.success) {
      const entry = result.errors.val[0]
      expect(entry.code).toBe(ErrorCode.REQUIRED)
      expect(entry.message).toBe('Parameter required')
      expect(entry.params).toBeDefined()
    }
  })

  test('type mismatch error has correct code and params', () => {
    const result = safeParse({ val: { type: 'string' } }, { val: 123 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const entry = result.errors.val[0]
      expect(entry.code).toBe(ErrorCode.TYPE_MISMATCH)
      expect(entry.params?.expected).toBe('string')
      expect(entry.params?.actual).toBe('integer')
    }
  })

  test('min violation error has correct code and params', () => {
    const result = safeParse({ val: { type: 'integer', min: 10 } }, { val: 5 })
    expect(result.success).toBe(false)
    if (!result.success) {
      const entry = result.errors.val[0]
      expect(entry.code).toBe(ErrorCode.MIN_VIOLATION)
      expect(entry.params?.min).toBe(10)
      expect(entry.params?.actual).toBe(5)
    }
  })

  test('max violation error has correct code and params', () => {
    const result = safeParse({ val: { type: 'string', max: 3 } }, { val: 'abcde' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const entry = result.errors.val[0]
      expect(entry.code).toBe(ErrorCode.MAX_VIOLATION)
      expect(entry.params?.max).toBe(3)
      expect(entry.params?.actual).toBe(5)
    }
  })

  test('pattern mismatch error has correct code', () => {
    const result = safeParse({ val: { type: 'string', pattern: /^[A-Z]+$/ } }, { val: 'hello' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.PATTERN_MISMATCH)
    }
  })

  test('invalid format error has correct code and format param', () => {
    const result = safeParse({ val: { type: 'string', special: 'email' } }, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const entry = result.errors.val[0]
      expect(entry.code).toBe(ErrorCode.INVALID_FORMAT)
      expect(entry.params?.format).toBe('email')
    }
  })

  test('value not in list error has correct code', () => {
    const result = safeParse({ val: { type: 'string', in: ['a', 'b'] } }, { val: 'z' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.VALUE_NOT_IN_LIST)
    }
  })

  test('array element not in list error has correct code', () => {
    const result = safeParse({ val: { type: 'array', in: ['a', 'b'] } }, { val: ['z'] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.ARRAY_ELEMENT_NOT_IN_LIST)
    }
  })

  test('not allowed error has correct code', () => {
    const result = safeParse({ name: { type: 'string' } }, { name: 'ok', extra: 1 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.extra[0].code).toBe(ErrorCode.NOT_ALLOWED)
    }
  })
})

describe('.info backward compat getter', () => {
  test('.info returns Record<string, string[]>', () => {
    try {
      parse({ val: { type: 'string', required: true } }, {})
      throw new Error('Should have thrown')
    } catch (e) {
      const msgs = (e as ODVException).info
      expect(msgs.val).toEqual(['Parameter required'])
    }
  })

  test('.info flattens multiple errors', () => {
    try {
      parse({ val: { type: 'string', min: 100, pattern: /^[0-9]+$/ } }, { val: 'abc' })
      throw new Error('Should have thrown')
    } catch (e) {
      const msgs = (e as ODVException).info
      expect(msgs.val.length).toBe(2)
      expect(typeof msgs.val[0]).toBe('string')
      expect(typeof msgs.val[1]).toBe('string')
    }
  })
})

describe('i18n message formatter', () => {
  test('custom message formatter overrides default messages', () => {
    const formatter = (code: string) => `custom:${code}`
    const result = safeParse(
      { val: { type: 'string', required: true } },
      {},
      { messageFormatter: formatter },
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const entry = result.errors.val[0]
      expect(entry.message).toBe('custom:REQUIRED')
      expect(entry.code).toBe(ErrorCode.REQUIRED)
    }
  })

  test('custom formatter receives params', () => {
    const formatter = (code: string, params: Record<string, unknown>) => {
      if (code === 'TYPE_MISMATCH') return `Tipo incorrecto: se requiere ${params.expected}`
      return code
    }
    const result = safeParse(
      { val: { type: 'string' } },
      { val: 123 },
      { messageFormatter: formatter },
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Tipo incorrecto: se requiere string')
    }
  })
})
