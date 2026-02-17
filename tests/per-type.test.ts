import { parse, safeParse, ErrorCode } from '../src/index'
import type { ODVRulesSchema } from '../src/index'

const opts = { strictMode: false } as const

function passes(rules: Parameters<typeof safeParse>[0], input: Record<string, unknown>): boolean {
  return safeParse(rules, input, opts).success
}

describe('per_type - basic', () => {
  const RULES: ODVRulesSchema = {
    val: {
      type: ['integer', 'string', 'array'],
      per_type: {
        integer: { max: 100 },
        string: { max: 15 },
        array: { max: 1 },
      },
    },
  }

  test('per_type works', () => {
    expect(passes(RULES, { val: 99 })).toBe(true)
    expect(passes(RULES, { val: '99999' })).toBe(true)
    expect(passes(RULES, { val: 'This is test' })).toBe(true)
    expect(passes(RULES, { val: [555] })).toBe(true)
    expect(passes(RULES, { val: 101 })).toBe(false)
    expect(passes(RULES, { val: '0000000000000000000000000' })).toBe(false)
    expect(passes(RULES, { val: [1, 2] })).toBe(false)
  })
})

describe('per_type - min/max per type', () => {
  test('different min/max for numbers vs strings', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['number', 'string'],
        per_type: {
          // integer valueType needs its own key; number per_type applies to floats only
          integer: { min: 0, max: 100 },
          number: { min: 0, max: 100 },
          string: { min: 1, max: 10 },
        },
      },
    }
    expect(passes(rules, { val: 50 })).toBe(true)
    expect(passes(rules, { val: 3.14 })).toBe(true)
    expect(passes(rules, { val: 'hello' })).toBe(true)
    expect(passes(rules, { val: 150 })).toBe(false)
    expect(passes(rules, { val: 150.5 })).toBe(false)
    expect(passes(rules, { val: 'this string is too long' })).toBe(false)
    expect(passes(rules, { val: '' })).toBe(false)
    expect(passes(rules, { val: -1 })).toBe(false)
  })

  test('integer falls under number per_type when number is specified', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['number'],
        per_type: {
          integer: { max: 10 },
          number: { max: 100 },
        },
      },
    }
    expect(passes(rules, { val: 5 })).toBe(true)
    expect(passes(rules, { val: 11 })).toBe(false) // integer > 10
    expect(passes(rules, { val: 50.5 })).toBe(true) // float uses number per_type
    expect(passes(rules, { val: 101.5 })).toBe(false) // float > 100
  })
})

describe('per_type - pattern per type', () => {
  test('pattern only for string type', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        per_type: {
          string: { pattern: /^[A-Z]+$/ },
        },
      },
    }
    expect(passes(rules, { val: 42 })).toBe(true)
    expect(passes(rules, { val: 'HELLO' })).toBe(true)
    expect(passes(rules, { val: 'hello' })).toBe(false)
  })
})

describe('per_type - special validator per type', () => {
  test('special validator for string type', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        per_type: {
          string: { special: 'email' },
        },
      },
    }
    expect(passes(rules, { val: 42 })).toBe(true)
    expect(passes(rules, { val: 'user@example.com' })).toBe(true)
    expect(passes(rules, { val: 'not-an-email' })).toBe(false)
  })
})

describe('per_type - in list per type', () => {
  test('different in lists per type', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        per_type: {
          integer: { in: [1, 2, 3] },
          string: { in: ['a', 'b', 'c'] },
        },
      },
    }
    expect(passes(rules, { val: 1 })).toBe(true)
    expect(passes(rules, { val: 'a' })).toBe(true)
    expect(passes(rules, { val: 4 })).toBe(false)
    expect(passes(rules, { val: 'd' })).toBe(false)
  })
})

describe('per_type - children per type', () => {
  test('children only for object type', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['string', 'object'],
        per_type: {
          object: {
            children: {
              name: { type: 'string', required: true },
            },
          },
        },
      },
    }
    expect(passes(rules, { val: 'just a string' })).toBe(true)
    expect(passes(rules, { val: { name: 'Alice' } })).toBe(true)
    expect(passes(rules, { val: {} })).toBe(false) // missing required name
  })
})

describe('per_type - error codes', () => {
  test('per_type violation produces correct error code', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        per_type: {
          integer: { max: 10 },
          string: { max: 5 },
        },
      },
    }
    const result = safeParse(rules, { val: 20 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.MAX_VIOLATION)
    }
  })

  test('per_type pattern mismatch error', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        per_type: {
          string: { pattern: /^[0-9]+$/ },
        },
      },
    }
    const result = safeParse(rules, { val: 'abc' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.PATTERN_MISMATCH)
    }
  })
})

describe('per_type - with transform', () => {
  test('transform applies before per_type rules', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        transform: (v) => typeof v === 'string' ? parseInt(v, 10) : v,
        per_type: {
          integer: { max: 100 },
        },
      },
    }
    expect(passes(rules, { val: '50' })).toBe(true)
    expect(passes(rules, { val: '200' })).toBe(false)
  })
})

describe('per_type - with parse/safeParse', () => {
  test('parse with per_type rules', () => {
    const schema = {
      val: {
        type: ['integer', 'string'] as const,
        per_type: {
          integer: { max: 100 },
          string: { max: 10 },
        },
      },
    }
    const result = parse(schema, { val: 50 })
    expect(result.val).toBe(50)
  })

  test('safeParse failure with per_type rules', () => {
    const schema = {
      val: {
        type: ['integer', 'string'] as const,
        per_type: {
          integer: { max: 10 },
        },
      },
    }
    const result = safeParse(schema, { val: 50 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.val[0].code).toBe(ErrorCode.MAX_VIOLATION)
    }
  })
})

describe('per_type - schema reuse', () => {
  test('per_type rules are not mutated across calls', () => {
    const rules: ODVRulesSchema = {
      val: {
        type: ['integer', 'string'],
        per_type: {
          integer: { max: 10 },
          string: { max: 5 },
        },
      },
    }
    // Run with integer
    expect(passes(rules, { val: 5 })).toBe(true)
    // Run with string — should use string per_type, not leaked integer per_type
    expect(passes(rules, { val: 'hi' })).toBe(true)
    // Run with integer again
    expect(passes(rules, { val: 8 })).toBe(true)
    // Verify the limits are still separate
    expect(passes(rules, { val: 11 })).toBe(false)
    expect(passes(rules, { val: 'toolong' })).toBe(false)
  })
})
