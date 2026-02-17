import { fromJsonSchema, toJsonSchema, ODVValidator, validate } from '../src/index'

describe('fromJsonSchema', () => {
  test('converts basic object schema with types', () => {
    const { schema, warnings } = fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        active: { type: 'boolean' },
      },
    })
    expect(warnings).toEqual([])
    expect(schema.name).toEqual({ type: 'string' })
    expect(schema.age).toEqual({ type: 'integer' })
    expect(schema.active).toEqual({ type: 'boolean' })
  })

  test('distributes required array to per-field required: true', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name'],
    })
    expect((schema.name as Record<string, unknown>).required).toBe(true)
    expect((schema.email as Record<string, unknown>).required).toBeUndefined()
  })

  test('converts string minLength/maxLength to min/max', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 50 },
      },
    })
    expect((schema.name as Record<string, unknown>).min).toBe(2)
    expect((schema.name as Record<string, unknown>).max).toBe(50)
  })

  test('converts numeric minimum/maximum to min/max', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        age: { type: 'integer', minimum: 0, maximum: 150 },
      },
    })
    expect((schema.age as Record<string, unknown>).min).toBe(0)
    expect((schema.age as Record<string, unknown>).max).toBe(150)
  })

  test('converts array minItems/maxItems to min/max', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        tags: { type: 'array', minItems: 1, maxItems: 10 },
      },
    })
    expect((schema.tags as Record<string, unknown>).min).toBe(1)
    expect((schema.tags as Record<string, unknown>).max).toBe(10)
  })

  test('converts multi-type min/max into per_type', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        value: { type: ['string', 'number'], minLength: 1, minimum: 0 },
      },
    })
    const rule = schema.value as Record<string, unknown>
    expect(rule.per_type).toBeDefined()
    const perType = rule.per_type as Record<string, Record<string, unknown>>
    expect(perType.string.min).toBe(1)
    expect(perType.number.min).toBe(0)
  })

  test('converts pattern', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        code: { type: 'string', pattern: '^[A-Z]{3}$' },
      },
    })
    expect((schema.code as Record<string, unknown>).pattern).toBe('^[A-Z]{3}$')
  })

  test('converts enum to in', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'inactive'] },
      },
    })
    expect((schema.status as Record<string, unknown>).in).toEqual(['active', 'inactive'])
  })

  test('converts default', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        role: { type: 'string', default: 'user' },
      },
    })
    expect((schema.role as Record<string, unknown>).default).toBe('user')
  })

  test('converts format to special', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        website: { type: 'string', format: 'uri' },
        id: { type: 'string', format: 'uuid' },
      },
    })
    expect((schema.email as Record<string, unknown>).special).toBe('email')
    expect((schema.website as Record<string, unknown>).special).toBe('url')
    expect((schema.id as Record<string, unknown>).special).toBe('uuid')
  })

  test('converts additionalProperties: false to strict', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    })
    expect(schema['@']).toEqual({ strict: true })
  })

  test('converts additionalProperties: true to non-strict', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
      additionalProperties: true,
    })
    expect(schema['@']).toEqual({ strict: false })
  })

  test('converts nested object with properties to children', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
          required: ['street'],
        },
      },
    })
    const addressRule = schema.address as Record<string, unknown>
    expect(addressRule.type).toBe('object')
    expect(addressRule.children).toBeDefined()
    const children = addressRule.children as Record<string, unknown>
    expect((children.street as Record<string, unknown>).required).toBe(true)
    expect((children.city as Record<string, unknown>).type).toBe('string')
  })

  test('converts array items to children with wildcard', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
        },
      },
    })
    const tagsRule = schema.tags as Record<string, unknown>
    expect(tagsRule.type).toBe('array')
    const children = tagsRule.children as Record<string, unknown>
    expect(children['*']).toBeDefined()
    expect((children['*'] as Record<string, unknown>).type).toBe('string')
    expect((children['*'] as Record<string, unknown>).min).toBe(1)
  })

  test('converts propertyNames to # key validator', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {},
      propertyNames: { pattern: '^[a-z]+$' },
    })
    expect(schema['#']).toBeDefined()
    expect((schema['#'] as Record<string, unknown>).pattern).toBe('^[a-z]+$')
  })

  test('collects warnings for unsupported keywords', () => {
    const { warnings } = fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      $ref: '#/definitions/Foo',
      oneOf: [{ type: 'string' }],
    })
    expect(warnings.length).toBeGreaterThan(0)
    expect(warnings.some(w => w.includes('$ref'))).toBe(true)
    expect(warnings.some(w => w.includes('oneOf'))).toBe(true)
  })

  test('warns on unsupported format', () => {
    const { warnings } = fromJsonSchema({
      type: 'object',
      properties: {
        ts: { type: 'string', format: 'duration' },
      },
    })
    expect(warnings.some(w => w.includes('duration'))).toBe(true)
  })

  test('converts const to in with single value', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        version: { type: 'integer', const: 1 },
      },
    })
    expect((schema.version as Record<string, unknown>).in).toEqual([1])
  })

  test('const takes priority over enum', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        val: { type: 'string', const: 'fixed', enum: ['a', 'b'] },
      },
    })
    expect((schema.val as Record<string, unknown>).in).toEqual(['fixed'])
  })

  test('converts exclusiveMinimum/exclusiveMaximum for integer', () => {
    const { schema, warnings } = fromJsonSchema({
      type: 'object',
      properties: {
        age: { type: 'integer', exclusiveMinimum: 0, exclusiveMaximum: 100 },
      },
    })
    // integer: exclusiveMinimum 0 → min 1, exclusiveMaximum 100 → max 99
    expect((schema.age as Record<string, unknown>).min).toBe(1)
    expect((schema.age as Record<string, unknown>).max).toBe(99)
    expect(warnings.length).toBe(0)
  })

  test('converts exclusiveMinimum/exclusiveMaximum for number with warning', () => {
    const { schema, warnings } = fromJsonSchema({
      type: 'object',
      properties: {
        score: { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 10 },
      },
    })
    expect((schema.score as Record<string, unknown>).min).toBe(0)
    expect((schema.score as Record<string, unknown>).max).toBe(10)
    expect(warnings.some(w => w.includes('exclusiveMinimum'))).toBe(true)
    expect(warnings.some(w => w.includes('exclusiveMaximum'))).toBe(true)
  })

  test('minimum takes priority over exclusiveMinimum', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        age: { type: 'integer', minimum: 5, exclusiveMinimum: 0 },
      },
    })
    expect((schema.age as Record<string, unknown>).min).toBe(5)
  })

  test('converts additionalProperties as schema object with warning', () => {
    const { schema, warnings } = fromJsonSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
      additionalProperties: { type: 'string' },
    })
    expect(schema['@']).toEqual({ strict: false })
    expect(warnings.some(w => w.includes('additionalProperties'))).toBe(true)
  })

  test('converts propertyNames with minLength/maxLength/enum', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {},
      propertyNames: { minLength: 2, maxLength: 10, enum: ['foo', 'bar'] },
    })
    const keyRule = schema['#'] as Record<string, unknown>
    expect(keyRule.min).toBe(2)
    expect(keyRule.max).toBe(10)
    expect(keyRule.in).toEqual(['foo', 'bar'])
  })

  test('converts propertyNames with const', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {},
      propertyNames: { const: 'onlyKey' },
    })
    const keyRule = schema['#'] as Record<string, unknown>
    expect(keyRule.in).toEqual(['onlyKey'])
  })

  test('converts propertyNames with format', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {},
      propertyNames: { format: 'uuid' },
    })
    const keyRule = schema['#'] as Record<string, unknown>
    expect(keyRule.special).toBe('uuid')
  })

  test('skips $defs and definitions without warning', () => {
    const { warnings } = fromJsonSchema({
      type: 'object',
      properties: { name: { type: 'string' } },
      $defs: { Foo: { type: 'string' } },
      definitions: { Bar: { type: 'number' } },
    })
    expect(warnings.some(w => w.includes('$defs'))).toBe(false)
    expect(warnings.some(w => w.includes('definitions'))).toBe(false)
  })

  test('converted schema validates data correctly', () => {
    const { schema } = fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0 },
      },
      required: ['name'],
    })
    const result = validate(schema, { name: 'Alice', age: 25 }, { strict: false })
    expect(result).not.toBe(false)
    expect(() => {
      validate(schema, {}, { strict: false })
    }).toThrow()
  })
})

describe('toJsonSchema', () => {
  test('converts basic ODV schema to JSON Schema', () => {
    const js = toJsonSchema({
      name: { type: 'string' },
      age: { type: 'integer' },
    })
    expect(js.type).toBe('object')
    expect(js.properties?.name).toEqual({ type: 'string' })
    expect(js.properties?.age).toEqual({ type: 'integer' })
  })

  test('collects required fields into required array', () => {
    const js = toJsonSchema({
      name: { type: 'string', required: true },
      email: { type: 'string' },
    })
    expect(js.required).toEqual(['name'])
  })

  test('converts min/max for strings to minLength/maxLength', () => {
    const js = toJsonSchema({
      name: { type: 'string', min: 2, max: 50 },
    })
    expect(js.properties?.name?.minLength).toBe(2)
    expect(js.properties?.name?.maxLength).toBe(50)
  })

  test('converts min/max for numbers to minimum/maximum', () => {
    const js = toJsonSchema({
      age: { type: 'integer', min: 0, max: 150 },
    })
    expect(js.properties?.age?.minimum).toBe(0)
    expect(js.properties?.age?.maximum).toBe(150)
  })

  test('converts min/max for arrays to minItems/maxItems', () => {
    const js = toJsonSchema({
      tags: { type: 'array', min: 1, max: 10 },
    })
    expect(js.properties?.tags?.minItems).toBe(1)
    expect(js.properties?.tags?.maxItems).toBe(10)
  })

  test('converts in to enum', () => {
    const js = toJsonSchema({
      status: { type: 'string', in: ['active', 'inactive'] },
    })
    expect(js.properties?.status?.enum).toEqual(['active', 'inactive'])
  })

  test('converts default', () => {
    const js = toJsonSchema({
      role: { type: 'string', default: 'user' },
    })
    expect(js.properties?.role?.default).toBe('user')
  })

  test('converts pattern (RegExp) to string', () => {
    const js = toJsonSchema({
      code: { type: 'string', pattern: /^[A-Z]{3}$/ },
    })
    expect(js.properties?.code?.pattern).toBe('^[A-Z]{3}$')
  })

  test('converts special to format', () => {
    const js = toJsonSchema({
      email: { type: 'string', special: 'email' },
      website: { type: 'string', special: 'url' },
      id: { type: 'string', special: 'uuid' },
    })
    expect(js.properties?.email?.format).toBe('email')
    expect(js.properties?.website?.format).toBe('uri')
    expect(js.properties?.id?.format).toBe('uuid')
  })

  test('converts strict to additionalProperties', () => {
    const js = toJsonSchema({
      '@': { strict: true },
      name: { type: 'string' },
    })
    expect(js.additionalProperties).toBe(false)
  })

  test('converts children with wildcard to items', () => {
    const js = toJsonSchema({
      tags: {
        type: 'array',
        children: {
          '*': { type: 'string', min: 1 },
        },
      },
    })
    expect(js.properties?.tags?.items).toBeDefined()
    expect(js.properties?.tags?.items?.type).toBe('string')
    expect(js.properties?.tags?.items?.minLength).toBe(1)
  })

  test('converts nested object children to properties', () => {
    const js = toJsonSchema({
      address: {
        type: 'object',
        children: {
          street: { type: 'string', required: true },
          city: { type: 'string' },
        },
      },
    })
    expect(js.properties?.address?.properties?.street?.type).toBe('string')
    expect(js.properties?.address?.required).toEqual(['street'])
  })

  test('converts # to propertyNames', () => {
    const js = toJsonSchema({
      '#': { type: 'string', pattern: '^[a-z]+$' },
    })
    expect(js.propertyNames).toBeDefined()
    expect(js.propertyNames?.pattern).toBe('^[a-z]+$')
  })

  test('converts per_type min/max to type-specific keywords', () => {
    const js = toJsonSchema({
      value: {
        type: ['string', 'number'] as const,
        per_type: {
          string: { min: 1, max: 100 },
          number: { min: 0, max: 999 },
        },
      },
    })
    const prop = js.properties?.value
    expect(prop?.minLength).toBe(1)
    expect(prop?.maxLength).toBe(100)
    expect(prop?.minimum).toBe(0)
    expect(prop?.maximum).toBe(999)
  })

  test('removes integer from type when number is present', () => {
    const js = toJsonSchema({
      val: { type: ['number', 'integer'] as const },
    })
    expect(js.properties?.val?.type).toBe('number')
  })

  test('converts single-element in to const', () => {
    const js = toJsonSchema({
      version: { type: 'integer', in: [1] },
    })
    expect(js.properties?.version?.const).toBe(1)
    expect(js.properties?.version?.enum).toBeUndefined()
  })

  test('converts multi-element in to enum', () => {
    const js = toJsonSchema({
      status: { type: 'string', in: ['a', 'b'] },
    })
    expect(js.properties?.status?.enum).toEqual(['a', 'b'])
    expect(js.properties?.status?.const).toBeUndefined()
  })

  test('converts # with min/max/in/special to propertyNames', () => {
    const js = toJsonSchema({
      '#': { type: 'string', min: 2, max: 10, in: ['foo', 'bar'], special: 'email' },
    })
    expect(js.propertyNames?.minLength).toBe(2)
    expect(js.propertyNames?.maxLength).toBe(10)
    expect(js.propertyNames?.enum).toEqual(['foo', 'bar'])
    expect(js.propertyNames?.format).toBe('email')
  })

  test('converts # with single-element in to const in propertyNames', () => {
    const js = toJsonSchema({
      '#': { type: 'string', in: ['onlyKey'] },
    })
    expect(js.propertyNames?.const).toBe('onlyKey')
    expect(js.propertyNames?.enum).toBeUndefined()
  })

  test('skips transform and apply_transformed', () => {
    const js = toJsonSchema({
      val: { type: 'string', transform: (v: unknown) => v, apply_transformed: true },
    })
    expect(js.properties?.val?.type).toBe('string')
    expect(js.properties?.val).not.toHaveProperty('transform')
    expect(js.properties?.val).not.toHaveProperty('apply_transformed')
  })
})

describe('ODVValidator.fromJsonSchema', () => {
  test('creates a working validator from JSON Schema', () => {
    const { validator, warnings } = ODVValidator.fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        age: { type: 'integer', minimum: 0 },
      },
      required: ['name'],
      additionalProperties: false,
    })
    expect(warnings).toEqual([])
    expect(validator.validate({ name: 'Alice', age: 25 })).toBe(true)
    expect(validator.data).toEqual({ name: 'Alice', age: 25 })
  })

  test('validator rejects invalid data', () => {
    const { validator } = ODVValidator.fromJsonSchema({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
      additionalProperties: false,
    })
    expect(() => validator.validate({})).toThrow()
  })

  test('returns warnings for unsupported keywords', () => {
    const { warnings } = ODVValidator.fromJsonSchema({
      type: 'object',
      properties: {},
      $ref: '#/definitions/Foo',
    })
    expect(warnings.some(w => w.includes('$ref'))).toBe(true)
  })
})

describe('roundtrip', () => {
  test('fromJsonSchema → toJsonSchema preserves core structure', () => {
    const original = {
      type: 'object' as const,
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        age: { type: 'integer', minimum: 0, maximum: 150 },
        email: { type: 'string', format: 'email' },
        status: { type: 'string', enum: ['active', 'inactive'], default: 'active' },
      },
      required: ['name', 'email'],
      additionalProperties: false,
    }
    const { schema } = fromJsonSchema(original)
    const roundtripped = toJsonSchema(schema)

    expect(roundtripped.type).toBe('object')
    expect(roundtripped.required).toEqual(expect.arrayContaining(['name', 'email']))
    expect(roundtripped.additionalProperties).toBe(false)
    expect(roundtripped.properties?.name?.minLength).toBe(1)
    expect(roundtripped.properties?.name?.maxLength).toBe(100)
    expect(roundtripped.properties?.age?.minimum).toBe(0)
    expect(roundtripped.properties?.email?.format).toBe('email')
    expect(roundtripped.properties?.status?.enum).toEqual(['active', 'inactive'])
    expect(roundtripped.properties?.status?.default).toBe('active')
  })
})
