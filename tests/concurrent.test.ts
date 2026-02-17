import { parse, safeParse, ODVValidator, ODVRules } from '../src/index'

const opts = { strictMode: false } as const

describe('concurrent validator usage', () => {
  test('separate parse calls with the same schema produce independent results', () => {
    const schema = {
      name: { type: 'string', required: true, min: 1 },
      age: { type: 'integer', min: 0 },
    } as const

    const result1 = safeParse(schema, { name: 'Alice', age: 30 }, opts)
    const result2 = safeParse(schema, { name: 'Bob', age: 25 }, opts)
    const result3 = safeParse(schema, { name: '', age: -1 }, opts)

    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)
    expect(result3.success).toBe(false)

    if (result1.success) expect(result1.data.name).toBe('Alice')
    if (result2.success) expect(result2.data.name).toBe('Bob')
  })

  test('shared ODVRules instance works correctly across multiple validators', () => {
    const rules = new ODVRules({
      email: { type: 'string', required: true, special: 'email' },
    } as const)

    const v1 = new ODVValidator(rules, { exceptionMode: false, strictMode: false })
    const v2 = new ODVValidator(rules, { exceptionMode: false, strictMode: false })

    v1.validate({ email: 'bad' })
    v2.validate({ email: 'good@example.com' })

    expect(Object.keys(v1.errors).length).toBeGreaterThan(0)
    expect(Object.keys(v2.errors).length).toBe(0)
    expect(v2.data).toEqual({ email: 'good@example.com' })
  })

  test('reusing the same ODVValidator instance resets state between calls', () => {
    const rules = new ODVRules({
      name: { type: 'string', required: true },
    } as const)

    const validator = new ODVValidator(rules, { exceptionMode: false, strictMode: false })

    // First call: invalid
    validator.validate({})
    expect(Object.keys(validator.errors).length).toBeGreaterThan(0)

    // Second call: valid — errors should be reset
    validator.validate({ name: 'Alice' })
    expect(Object.keys(validator.errors).length).toBe(0)
    expect(validator.data).toEqual({ name: 'Alice' })

    // Third call: invalid again — should not carry over from second call
    validator.validate({})
    expect(Object.keys(validator.errors).length).toBeGreaterThan(0)
    expect(validator.data).toEqual({})
  })

  test('concurrent safeParse calls with transforms produce independent results', () => {
    const schema = {
      value: {
        type: 'string',
        required: true,
        transform: (v: unknown) => typeof v === 'string' ? v.toUpperCase() : v,
        apply_transformed: true,
      },
    } as const

    const results = ['hello', 'world', 'foo'].map(v =>
      safeParse(schema, { value: v }, opts),
    )

    expect(results[0].success && results[0].data.value).toBe('HELLO')
    expect(results[1].success && results[1].data.value).toBe('WORLD')
    expect(results[2].success && results[2].data.value).toBe('FOO')
  })

  test('Promise.all with parse calls produces correct independent results', async() => {
    const schema = {
      id: { type: 'integer', required: true, min: 1 },
      name: { type: 'string', required: true },
    } as const

    const inputs = [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
      { id: 3, name: 'Charlie' },
    ]

    const results = await Promise.all(
      inputs.map(input => Promise.resolve(parse(schema, input, opts))),
    )

    expect(results[0]).toEqual({ id: 1, name: 'Alice' })
    expect(results[1]).toEqual({ id: 2, name: 'Bob' })
    expect(results[2]).toEqual({ id: 3, name: 'Charlie' })
  })

  test('shared rules instance does not corrupt isValidated flag across validators', () => {
    const rules = new ODVRules({
      x: { type: 'integer' },
    } as const)

    expect(rules.isValidated).toBe(false)

    const v1 = new ODVValidator(rules, { exceptionMode: false, strictMode: false })
    v1.validate({ x: 1 })
    expect(rules.isValidated).toBe(true)

    // Second validator reuses the already-validated rules
    const v2 = new ODVValidator(rules, { exceptionMode: false, strictMode: false })
    v2.validate({ x: 2 })
    expect(v2.data).toEqual({ x: 2 })
    expect(Object.keys(v2.errors).length).toBe(0)
  })
})
