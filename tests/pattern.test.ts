import { safeParse, ErrorCode } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('pattern - regex validation', () => {
  test('string matching regex passes', () => {
    expect(passes({ val: { type: 'string', pattern: /^[a-z]+$/ } }, { val: 'hello' })).toBe(true)
  })

  test('string not matching regex fails', () => {
    expect(passes({ val: { type: 'string', pattern: /^[a-z]+$/ } }, { val: 'Hello123' })).toBe(false)
  })

  test('pattern as string', () => {
    expect(passes({ val: { type: 'string', pattern: '^[0-9]+$' } }, { val: '12345' })).toBe(true)
    expect(passes({ val: { type: 'string', pattern: '^[0-9]+$' } }, { val: 'abc' })).toBe(false)
  })

  test('pattern on non-string type fails', () => {
    expect(passes({ val: { type: ['integer', 'string'], pattern: /^[0-9]+$/ } }, { val: 123 })).toBe(false)
  })

  test('pattern error message', () => {
    const result = safeParse({ val: { type: 'string', pattern: /^[A-Z]+$/ } }, { val: 'hello' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.PATTERN_MISMATCH)
      expect(result.errors.val[0].message).toBe('Incorrect string format')
    }
  })

  test('complex regex pattern', () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    expect(passes({ val: { type: 'string', pattern: datePattern } }, { val: '2024-01-15' })).toBe(true)
    expect(passes({ val: { type: 'string', pattern: datePattern } }, { val: '2024/01/15' })).toBe(false)
  })

  test('empty string with pattern', () => {
    expect(passes({ val: { type: 'string', pattern: /^.+$/ } }, { val: '' })).toBe(false)
    expect(passes({ val: { type: 'string', pattern: /^.*$/ } }, { val: '' })).toBe(true)
  })
})

describe('special - email validation', () => {
  test('valid email passes', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'user@example.com' })).toBe(true)
  })

  test('valid email with subdomain passes', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'user@mail.example.com' })).toBe(true)
  })

  test('valid email with plus sign passes', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'user+tag@example.com' })).toBe(true)
  })

  test('valid email with dots in local part', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'first.last@example.com' })).toBe(true)
  })

  test('invalid email - no @', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'notanemail' })).toBe(false)
  })

  test('invalid email - no domain', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'user@' })).toBe(false)
  })

  test('invalid email - no local part', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: '@example.com' })).toBe(false)
  })

  test('invalid email - spaces', () => {
    expect(passes({ val: { type: 'string', special: 'email' } }, { val: 'user @example.com' })).toBe(false)
  })

  test('email on non-string fails with type error', () => {
    expect(passes({ val: { type: ['integer', 'string'], special: 'email' } }, { val: 123 })).toBe(false)
  })

  test('email error message', () => {
    const result = safeParse({ val: { type: 'string', special: 'email' } }, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.INVALID_FORMAT)
      expect(result.errors.val[0].message).toBe('Incorrect email')
    }
  })
})

describe('special - phone validation', () => {
  test('valid international phone numbers', () => {
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+1234567890' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+441234567890' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+861380013800' })).toBe(true)
  })

  test('invalid phone numbers', () => {
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '1234567890' })).toBe(false) // no +
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+0123456789' })).toBe(false) // starts with 0
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+123' })).toBe(false) // too short
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+12345678901234567' })).toBe(false) // too long
    expect(passes({ val: { type: 'string', special: 'phone' } }, { val: '+1234 567 890' })).toBe(false) // spaces
  })

  test('phone error message', () => {
    const result = safeParse({ val: { type: 'string', special: 'phone' } }, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect phone')
    }
  })
})

describe('special - us-phone validation', () => {
  test('valid US phone numbers', () => {
    expect(passes({ val: { type: 'string', special: 'us-phone' } }, { val: '+12125551234' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'us-phone' } }, { val: '+19175551234' })).toBe(true)
  })

  test('invalid US phone numbers', () => {
    expect(passes({ val: { type: 'string', special: 'us-phone' } }, { val: '+10125551234' })).toBe(false) // area code starts with 0
    expect(passes({ val: { type: 'string', special: 'us-phone' } }, { val: '+11125551234' })).toBe(false) // area code starts with 1
    expect(passes({ val: { type: 'string', special: 'us-phone' } }, { val: '+4412345678' })).toBe(false) // not US
    expect(passes({ val: { type: 'string', special: 'us-phone' } }, { val: '+1212555123' })).toBe(false) // too short
  })

  test('us-phone error message', () => {
    const result = safeParse({ val: { type: 'string', special: 'us-phone' } }, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect us-phone')
    }
  })
})

describe('special - url validation', () => {
  test('valid URLs', () => {
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://example.com' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'http://example.com' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://example.com/path/to/page' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://sub.example.com' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://example.com:8080' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://example.com/path?query=1&foo=bar' })).toBe(true)
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://example.com/path#fragment' })).toBe(true)
  })

  test('invalid URLs', () => {
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'example.com' })).toBe(false) // no protocol
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'ftp://example.com' })).toBe(false) // wrong protocol
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://' })).toBe(false) // no host
    expect(passes({ val: { type: 'string', special: 'url' } }, { val: 'https://example .com' })).toBe(false) // space
  })

  test('url error message', () => {
    const result = safeParse({ val: { type: 'string', special: 'url' } }, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect url')
    }
  })
})

describe('special - uuid validation', () => {
  test('valid UUIDs', () => {
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '550e8400-e29b-41d4-a716-446655440000' })).toBe(true) // v4
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '6ba7b810-9dad-11d1-80b4-00c04fd430c8' })).toBe(true) // v1
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '6ba7b831-9dad-21d1-80b4-00c04fd430c8' })).toBe(true) // v2
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: 'a3bb189e-8bf9-3888-9912-ace4e6543002' })).toBe(true) // v3
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: 'bdfc74dc-8b1c-519c-8a04-4102e9c8a049' })).toBe(true) // v5
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '00000000-0000-0000-0000-000000000000' })).toBe(true) // NIL
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: 'BDFC74DC-8B1C-519C-8A04-4102E9C8A049' })).toBe(true) // uppercase
  })

  test('invalid UUIDs', () => {
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: 'not-a-uuid' })).toBe(false)
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '550e8400e29b41d4a716446655440000' })).toBe(false) // no dashes
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '550e8400-e29b-41d4-a716-44665544000' })).toBe(false) // too short
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '550e8400-e29b-61d4-a716-446655440000' })).toBe(false) // version 6
    expect(passes({ val: { type: 'string', special: 'uuid' } }, { val: '550e8400-e29b-41d4-c716-446655440000' })).toBe(false) // invalid variant
  })

  test('uuid error message', () => {
    const result = safeParse({ val: { type: 'string', special: 'uuid' } }, { val: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].message).toBe('Incorrect uuid')
    }
  })
})

describe('pattern and special combined', () => {
  test('both pattern and email can be applied', () => {
    const rules = { val: { type: 'string' as const, special: 'email', pattern: /^[a-z]+@/ } }
    expect(passes(rules, { val: 'user@example.com' })).toBe(true)
    expect(passes(rules, { val: 'USER@example.com' })).toBe(false)
  })
})
