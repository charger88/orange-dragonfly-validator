import {
  safeParse, ODValidatorRule,
  EMAIL_PATTERN, PHONE_PATTERN, US_PHONE_PATTERN, URL_PATTERN, UUID_PATTERN,
  IPV4_PATTERN, DATE_PATTERN, DATETIME_PATTERN, HEX_COLOR_PATTERN,
  SPECIAL_VALIDATORS, SPECIAL_MAX_LENGTHS,
} from '../src/index'
import type { ODValidatorErrors, ODValidatorRuleSchema } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('special - ipv4 validation', () => {
  const rule = { val: { type: 'string', special: 'ipv4' } } as const

  test('valid IPv4 addresses', () => {
    expect(passes(rule, { val: '192.168.1.1' })).toBe(true)
    expect(passes(rule, { val: '0.0.0.0' })).toBe(true)
    expect(passes(rule, { val: '255.255.255.255' })).toBe(true)
    expect(passes(rule, { val: '10.0.0.1' })).toBe(true)
    expect(passes(rule, { val: '127.0.0.1' })).toBe(true)
    expect(passes(rule, { val: '1.2.3.4' })).toBe(true)
  })

  test('invalid IPv4 addresses', () => {
    expect(passes(rule, { val: '256.1.1.1' })).toBe(false)
    expect(passes(rule, { val: '192.168.1' })).toBe(false)
    expect(passes(rule, { val: '192.168.1.1.1' })).toBe(false)
    expect(passes(rule, { val: '192.168.1.999' })).toBe(false)
    expect(passes(rule, { val: 'abc.def.ghi.jkl' })).toBe(false)
    expect(passes(rule, { val: '' })).toBe(false)
    expect(passes(rule, { val: '192.168.01.1' })).toBe(false) // leading zero
    expect(passes(rule, { val: ' 192.168.1.1' })).toBe(false) // leading space
  })

  test('ipv4 error message', () => {
    const result = safeParse(rule, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect ipv4')
    }
  })
})

describe('special - date validation', () => {
  const rule = { val: { type: 'string', special: 'date' } } as const

  test('valid dates', () => {
    expect(passes(rule, { val: '2024-01-15' })).toBe(true)
    expect(passes(rule, { val: '2000-12-31' })).toBe(true)
    expect(passes(rule, { val: '1999-01-01' })).toBe(true)
    expect(passes(rule, { val: '2024-02-29' })).toBe(true) // regex doesn't check leap years
  })

  test('invalid dates', () => {
    expect(passes(rule, { val: '2024-13-01' })).toBe(false) // month > 12
    expect(passes(rule, { val: '2024-00-01' })).toBe(false) // month 0
    expect(passes(rule, { val: '2024-01-32' })).toBe(false) // day > 31
    expect(passes(rule, { val: '2024-01-00' })).toBe(false) // day 0
    expect(passes(rule, { val: '24-01-15' })).toBe(false) // 2-digit year
    expect(passes(rule, { val: '2024/01/15' })).toBe(false) // wrong separator
    expect(passes(rule, { val: 'January 15, 2024' })).toBe(false)
    expect(passes(rule, { val: '' })).toBe(false)
    expect(passes(rule, { val: '2024-1-15' })).toBe(false) // single digit month
    expect(passes(rule, { val: '2024-01-5' })).toBe(false) // single digit day
  })

  test('date error message', () => {
    const result = safeParse(rule, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect date')
    }
  })
})

describe('special - datetime validation', () => {
  const rule = { val: { type: 'string', special: 'datetime' } } as const

  test('valid datetimes', () => {
    expect(passes(rule, { val: '2024-01-15T10:30:00Z' })).toBe(true)
    expect(passes(rule, { val: '2024-01-15T10:30:00+05:30' })).toBe(true)
    expect(passes(rule, { val: '2024-01-15T10:30:00-04:00' })).toBe(true)
    expect(passes(rule, { val: '2024-01-15T23:59:59Z' })).toBe(true)
    expect(passes(rule, { val: '2024-01-15T00:00:00Z' })).toBe(true)
    expect(passes(rule, { val: '2024-01-15T10:30:00.123Z' })).toBe(true) // fractional seconds
    expect(passes(rule, { val: '2024-01-15T10:30:00.123456Z' })).toBe(true) // microseconds
  })

  test('invalid datetimes', () => {
    expect(passes(rule, { val: '2024-01-15' })).toBe(false) // date only
    expect(passes(rule, { val: '2024-01-15T25:00:00Z' })).toBe(false) // hour > 23
    expect(passes(rule, { val: '2024-01-15T10:60:00Z' })).toBe(false) // minute > 59
    expect(passes(rule, { val: '2024-01-15T10:30:60Z' })).toBe(false) // second > 59
    expect(passes(rule, { val: '2024-01-15T10:30:00' })).toBe(false) // no timezone
    expect(passes(rule, { val: '2024-01-15 10:30:00Z' })).toBe(false) // space instead of T
    expect(passes(rule, { val: '' })).toBe(false)
    expect(passes(rule, { val: '2024-13-15T10:30:00Z' })).toBe(false) // invalid month
  })

  test('datetime error message', () => {
    const result = safeParse(rule, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect datetime')
    }
  })
})

describe('special - hex-color validation', () => {
  const rule = { val: { type: 'string', special: 'hex-color' } } as const

  test('valid hex colors', () => {
    expect(passes(rule, { val: '#fff' })).toBe(true) // shorthand
    expect(passes(rule, { val: '#FFF' })).toBe(true) // uppercase shorthand
    expect(passes(rule, { val: '#000' })).toBe(true)
    expect(passes(rule, { val: '#ff0000' })).toBe(true) // 6-digit
    expect(passes(rule, { val: '#FF0000' })).toBe(true) // uppercase 6-digit
    expect(passes(rule, { val: '#00ff00' })).toBe(true)
    expect(passes(rule, { val: '#0a0B0c' })).toBe(true) // mixed case
    expect(passes(rule, { val: '#ff000080' })).toBe(true) // 8-digit with alpha
    expect(passes(rule, { val: '#00000000' })).toBe(true) // fully transparent
    expect(passes(rule, { val: '#FFFFFFFF' })).toBe(true) // fully opaque
  })

  test('invalid hex colors', () => {
    expect(passes(rule, { val: 'fff' })).toBe(false) // no #
    expect(passes(rule, { val: '#ff' })).toBe(false) // 2 digits
    expect(passes(rule, { val: '#ffff' })).toBe(false) // 4 digits
    expect(passes(rule, { val: '#fffff' })).toBe(false) // 5 digits
    expect(passes(rule, { val: '#fffffffff' })).toBe(false) // 9 digits
    expect(passes(rule, { val: '#gggggg' })).toBe(false) // invalid hex chars
    expect(passes(rule, { val: '' })).toBe(false)
    expect(passes(rule, { val: 'red' })).toBe(false) // CSS color name
  })

  test('hex-color error message', () => {
    const result = safeParse(rule, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect hex-color')
    }
  })
})

describe('index.ts - re-exported pattern constants and classes', () => {
  test('ODValidatorRule is usable from the main export', () => {
    expect(ODValidatorRule).toBeDefined()
    expect(typeof ODValidatorRule).toBe('function')
  })

  test('EMAIL_PATTERN is a RegExp that matches valid emails', () => {
    expect(EMAIL_PATTERN).toBeInstanceOf(RegExp)
    expect(EMAIL_PATTERN.test('user@example.com')).toBe(true)
    expect(EMAIL_PATTERN.test('not-an-email')).toBe(false)
  })

  test('PHONE_PATTERN is a RegExp', () => {
    expect(PHONE_PATTERN).toBeInstanceOf(RegExp)
  })

  test('US_PHONE_PATTERN is a RegExp', () => {
    expect(US_PHONE_PATTERN).toBeInstanceOf(RegExp)
  })

  test('URL_PATTERN is a RegExp', () => {
    expect(URL_PATTERN).toBeInstanceOf(RegExp)
  })

  test('UUID_PATTERN is a RegExp', () => {
    expect(UUID_PATTERN).toBeInstanceOf(RegExp)
  })

  test('IPV4_PATTERN is a RegExp', () => {
    expect(IPV4_PATTERN).toBeInstanceOf(RegExp)
  })

  test('DATE_PATTERN is a RegExp', () => {
    expect(DATE_PATTERN).toBeInstanceOf(RegExp)
  })

  test('DATETIME_PATTERN is a RegExp', () => {
    expect(DATETIME_PATTERN).toBeInstanceOf(RegExp)
  })

  test('HEX_COLOR_PATTERN is a RegExp', () => {
    expect(HEX_COLOR_PATTERN).toBeInstanceOf(RegExp)
  })

  test('SPECIAL_VALIDATORS is an object with RegExp values', () => {
    expect(SPECIAL_VALIDATORS).toBeDefined()
    expect(typeof SPECIAL_VALIDATORS).toBe('object')
    expect(SPECIAL_VALIDATORS['email']).toBeInstanceOf(RegExp)
  })

  test('SPECIAL_MAX_LENGTHS is an object with numeric values', () => {
    expect(SPECIAL_MAX_LENGTHS).toBeDefined()
    expect(typeof SPECIAL_MAX_LENGTHS['email']).toBe('number')
  })
})

describe('rule.ts - checkPattern with unknown special (line 119 false branch)', () => {
  test('unknown special skips pattern test (specialPattern is undefined)', () => {
    // SPECIAL_VALIDATORS['completely-unknown'] = undefined → line 119 false branch
    const errors: ODValidatorErrors = {}
    ODValidatorRule.applyRule(
      { special: 'completely-unknown' } as unknown as ODValidatorRuleSchema,
      'any-string',
      'field',
      errors,
      () => { /* no children */ },
    )
    // No error added (special not recognized, no pattern to test against)
    expect(errors.field).toBeUndefined()
  })
})
