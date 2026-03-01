import { createValidator, ODValidator, ODValidatorRules, ODValidatorException } from '../src/index'

const schema = {
  name: { type: 'string' as const, required: true },
  age:  { type: 'integer' as const, min: 0, max: 150 },
} as const

describe('createValidator', () => {
  test('returns an ODValidator instance', () => {
    const validator = createValidator(schema)
    expect(validator).toBeInstanceOf(ODValidator)
  })

  test('rules is an ODValidatorRules instance', () => {
    const validator = createValidator(schema)
    expect(validator.rules).toBeInstanceOf(ODValidatorRules)
  })

  test('validates valid input and returns true', () => {
    const validator = createValidator(schema, { exceptionMode: false })
    const result = validator.validate({ name: 'Alice', age: 30 })
    expect(result).toBe(true)
  })

  test('validates invalid input and returns false in non-exception mode', () => {
    const validator = createValidator(schema, { exceptionMode: false })
    const result = validator.validate({ name: 123 as unknown as string })
    expect(result).toBe(false)
    expect(validator.errors.name).toBeDefined()
  })

  test('throws ODValidatorException in exception mode (default)', () => {
    const validator = createValidator(schema)
    expect(() => validator.validate({ name: 123 as unknown as string })).toThrow(ODValidatorException)
  })

  test('reports REQUIRED error for missing required field', () => {
    const validator = createValidator(schema, { exceptionMode: false })
    validator.validate({})
    expect(validator.errors.name).toBeDefined()
    expect(validator.errors.name[0].code).toBe('REQUIRED')
  })

  test('validator is reusable across multiple calls', () => {
    const validator = createValidator(schema, { exceptionMode: false })

    validator.validate({ name: 'Alice' })
    expect(validator.errors).toEqual({})

    validator.validate({ age: 30 })
    expect(validator.errors.name).toBeDefined()

    validator.validate({ name: 'Bob', age: 25 })
    expect(validator.errors).toEqual({})
  })

  test('data is populated after successful validation', () => {
    const validator = createValidator(schema, { exceptionMode: false, strictMode: false })
    validator.validate({ name: 'Alice', age: 30 })
    expect(validator.data).toMatchObject({ name: 'Alice', age: 30 })
  })

  test('data is populated (with partial input) even after failed validation', () => {
    const validator = createValidator(schema, { exceptionMode: false })
    validator.validate({})
    expect(validator.data).not.toBeNull()
    expect(validator.errors.name).toBeDefined()
  })

  test('respects strictMode option', () => {
    const validator = createValidator(schema, { exceptionMode: false, strictMode: true })
    const result = validator.validate({ name: 'Alice', extra: 'field' } as Record<string, unknown>)
    expect(result).toBe(false)
    expect(validator.errors.extra).toBeDefined()
  })

  test('strictMode false allows extra keys', () => {
    const validator = createValidator(schema, { exceptionMode: false, strictMode: false })
    const result = validator.validate({ name: 'Alice', extra: 'field' } as Record<string, unknown>)
    expect(result).toBe(true)
  })

  test('default options match ODValidator defaults (strict=true, exception=true)', () => {
    const validator = createValidator(schema)
    expect(validator.strictMode).toBe(true)
    expect(validator.exceptionMode).toBe(true)
  })

  test('works with an empty schema', () => {
    const validator = createValidator({}, { exceptionMode: false, strictMode: false })
    const result = validator.validate({ anything: 'goes' } as Record<string, unknown>)
    expect(result).toBe(true)
  })

  test('each call to createValidator creates an independent validator', () => {
    const v1 = createValidator(schema, { exceptionMode: false })
    const v2 = createValidator(schema, { exceptionMode: false })
    v1.validate({})
    expect(v1.errors.name).toBeDefined()
    expect(v2.errors).toEqual({})
  })
})
