import { safeParse } from '../src/index'

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
