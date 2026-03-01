import { fromJsonSchema, toJsonSchema, ODValidator, parse } from '../src/index'

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
    const result = parse(schema, { name: 'Alice', age: 25 }, { strictMode: false })
    expect(result).not.toBe(false)
    expect(() => {
      parse(schema, {}, { strictMode: false })
    }).toThrow()
  })
})

describe('toJsonSchema', () => {
  test('converts basic ODValidator schema to JSON Schema', () => {
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

describe('ODValidator.fromJsonSchema', () => {
  test('creates a working validator from JSON Schema', () => {
    const { validator, warnings } = ODValidator.fromJsonSchema({
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
    const { validator } = ODValidator.fromJsonSchema({
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
    const { warnings } = ODValidator.fromJsonSchema({
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

describe('fromJsonSchema - no-type min/max fallback (lines 178-185)', () => {
  // When no type is specified, fromJsonSchema falls back to checking each min/max keyword

  test('minimum with no type maps to rule.min', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { minimum: 5 } } })
    expect((schema.val as Record<string, unknown>).min).toBe(5)
  })

  test('maximum with no type maps to rule.max', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { maximum: 100 } } })
    expect((schema.val as Record<string, unknown>).max).toBe(100)
  })

  test('exclusiveMinimum with no type maps to rule.min', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { exclusiveMinimum: 3 } } })
    expect((schema.val as Record<string, unknown>).min).toBe(3)
  })

  test('exclusiveMaximum with no type maps to rule.max', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { exclusiveMaximum: 99 } } })
    expect((schema.val as Record<string, unknown>).max).toBe(99)
  })

  test('minLength with no type maps to rule.min when minimum is absent', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { minLength: 2 } } })
    expect((schema.val as Record<string, unknown>).min).toBe(2)
  })

  test('maxLength with no type maps to rule.max when maximum is absent', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { maxLength: 50 } } })
    expect((schema.val as Record<string, unknown>).max).toBe(50)
  })

  test('minItems with no type maps to rule.min when others are absent', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { minItems: 1 } } })
    expect((schema.val as Record<string, unknown>).min).toBe(1)
  })

  test('maxItems with no type maps to rule.max when others are absent', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { maxItems: 10 } } })
    expect((schema.val as Record<string, unknown>).max).toBe(10)
  })
})

describe('fromJsonSchema - resolveMinMaxForType single-type only-max / float exclusive / array', () => {
  test('string with only maxLength (no minLength) sets max but not min', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { type: 'string', maxLength: 50 } } })
    const rule = schema.val as Record<string, unknown>
    expect(rule.max).toBe(50)
    expect(rule.min).toBeUndefined()
  })

  test('number with only maximum (no minimum) sets max but not min', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { type: 'number', maximum: 100 } } })
    const rule = schema.val as Record<string, unknown>
    expect(rule.max).toBe(100)
    expect(rule.min).toBeUndefined()
  })

  test('number with float exclusiveMinimum generates a warning', () => {
    const { schema, warnings } = fromJsonSchema({ type: 'object', properties: { val: { type: 'number', exclusiveMinimum: 3.5 } } })
    expect((schema.val as Record<string, unknown>).min).toBe(3.5)
    expect(warnings.some(w => w.includes('exclusiveMinimum'))).toBe(true)
  })

  test('number with float exclusiveMaximum generates a warning', () => {
    const { schema, warnings } = fromJsonSchema({ type: 'object', properties: { val: { type: 'number', exclusiveMaximum: 99.5 } } })
    expect((schema.val as Record<string, unknown>).max).toBe(99.5)
    expect(warnings.some(w => w.includes('exclusiveMaximum'))).toBe(true)
  })

  test('array with only minItems (no maxItems) sets min but not max', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { type: 'array', minItems: 1 } } })
    const rule = schema.val as Record<string, unknown>
    expect(rule.min).toBe(1)
    expect(rule.max).toBeUndefined()
  })

  test('array with only maxItems (no minItems) sets max but not min', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: { val: { type: 'array', maxItems: 5 } } })
    const rule = schema.val as Record<string, unknown>
    expect(rule.max).toBe(5)
    expect(rule.min).toBeUndefined()
  })
})

describe('fromJsonSchema - multi-type per_type distribution (lines 154-168)', () => {
  test('multi-type with both min and max distributes to per_type', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: {
      val: { type: ['string', 'number'], minLength: 2, maxLength: 50, minimum: 10, maximum: 100 },
    }})
    const perType = (schema.val as Record<string, unknown>).per_type as Record<string, Record<string, unknown>>
    expect(perType?.string?.min).toBe(2)
    expect(perType?.string?.max).toBe(50)
    expect(perType?.number?.min).toBe(10)
    expect(perType?.number?.max).toBe(100)
  })

  test('multi-type with only max produces per_type entries with max only (no min)', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: {
      val: { type: ['string', 'number'], maxLength: 50, maximum: 100 },
    }})
    const perType = (schema.val as Record<string, unknown>).per_type as Record<string, Record<string, unknown>>
    expect(perType?.string?.max).toBe(50)
    expect(perType?.string?.min).toBeUndefined()
    expect(perType?.number?.max).toBe(100)
  })

  test('non-applicable type (boolean) in multi-type skipped in per_type', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: {
      val: { type: ['boolean', 'string'], minLength: 2 },
    }})
    const perType = (schema.val as Record<string, unknown>).per_type as Record<string, Record<string, unknown>> | undefined
    // boolean has no applicable min/max → only string gets per_type entry
    expect(perType?.string?.min).toBe(2)
    expect(perType?.boolean).toBeUndefined()
  })

  test('multi-type where no type supports min/max → per_type stays empty, rule.per_type undefined', () => {
    const { schema } = fromJsonSchema({ type: 'object', properties: {
      val: { type: ['boolean', 'null'], minimum: 5 },
    }})
    const rule = schema.val as Record<string, unknown>
    expect(rule.per_type).toBeUndefined()
    expect(rule.min).toBeUndefined()
  })
})

describe('fromJsonSchema - unsupported format warning (line 144)', () => {
  test('unsupported format string in property produces a warning', () => {
    const { warnings } = fromJsonSchema({ type: 'object', properties: {
      val: { type: 'string', format: 'totally-unsupported-format' },
    }})
    expect(warnings.some(w => w.includes('totally-unsupported-format'))).toBe(true)
  })
})

describe('fromJsonSchema - propertyNames edge cases (lines 234-241)', () => {
  test('propertyNames with unsupported format does not set special on # rule', () => {
    const { schema } = fromJsonSchema({ type: 'object', propertyNames: { format: 'unsupported-key-format' } })
    const hashRule = schema['#'] as Record<string, unknown>
    expect(hashRule).toBeDefined()
    expect(hashRule.special).toBeUndefined()
  })

  test('propertyNames present but no properties key → has # rule but no field rules', () => {
    const { schema } = fromJsonSchema({ type: 'object', propertyNames: { minLength: 1 } })
    expect(schema['#']).toBeDefined()
    const nonMetaKeys = Object.keys(schema).filter(k => k !== '@' && k !== '#')
    expect(nonMetaKeys.length).toBe(0)
  })
})

describe('toJsonSchema - uncovered paths', () => {
  test('multi-type with direct min/max uses first type for JSON Schema keywords (line 336)', () => {
    // type: ['string', 'number'] with direct min/max (not per_type)
    // The else branch at line 336: applyMinMaxToJsonSchema(js, resolvedTypes[0], rule.min, rule.max)
    const js = toJsonSchema({
      val: { type: ['string', 'number'] as const, min: 5, max: 100 },
    })
    // 'string' is first type → minLength/maxLength
    expect(js.properties?.val?.minLength).toBe(5)
    expect(js.properties?.val?.maxLength).toBe(100)
  })

  test('no-type rule with min/max defaults to minimum/maximum keywords (lines 376-377)', () => {
    // applyMinMaxToJsonSchema with undefined type → else branch → minimum/maximum
    const js = toJsonSchema({
      val: { min: 0, max: 99 },
    })
    expect(js.properties?.val?.minimum).toBe(0)
    expect(js.properties?.val?.maximum).toBe(99)
  })

  test('strict: false converts to additionalProperties: true (lines 391-392)', () => {
    const js = toJsonSchema({
      '@': { strict: false },
      name: { type: 'string' },
    })
    expect(js.additionalProperties).toBe(true)
  })
})

describe('toJsonSchema - additional branch coverage', () => {
  test('rule with type "function" (filtered out) produces no type field in JSON Schema', () => {
    // All types filtered → types.length === 0 → neither if nor else-if taken → no js.type
    const js = toJsonSchema({ val: { type: 'function' as unknown as 'string' } })
    expect(js.properties?.val?.type).toBeUndefined()
  })

  test('rule with string pattern (not RegExp) outputs pattern as-is', () => {
    const js = toJsonSchema({ val: { pattern: '^[a-z]+$' } })
    expect(js.properties?.val?.pattern).toBe('^[a-z]+$')
  })

  test('rule with unknown special does not set format in JSON Schema', () => {
    const js = toJsonSchema({ val: { special: 'unknown-special' as unknown as 'email' } })
    expect(js.properties?.val?.format).toBeUndefined()
  })

  test('array type with children containing "*" generates items', () => {
    const js = toJsonSchema({
      val: { type: 'array', children: { '*': { type: 'string' } } },
    })
    expect(js.properties?.val?.items).toBeDefined()
    expect(js.properties?.val?.items?.type).toBe('string')
    // isArray=true, isObject=false → second if block NOT entered
    expect(js.properties?.val?.properties).toBeUndefined()
  })

  test('number type with only min generates minimum but not maximum', () => {
    const js = toJsonSchema({ val: { type: 'number', min: 5 } })
    expect(js.properties?.val?.minimum).toBe(5)
    expect(js.properties?.val?.maximum).toBeUndefined()
  })

  test('number type with only max generates maximum but not minimum', () => {
    const js = toJsonSchema({ val: { type: 'number', max: 100 } })
    expect(js.properties?.val?.maximum).toBe(100)
    expect(js.properties?.val?.minimum).toBeUndefined()
  })

  test('integer type with min and max generates minimum and maximum', () => {
    const js = toJsonSchema({ val: { type: 'integer', min: 1, max: 10 } })
    expect(js.properties?.val?.minimum).toBe(1)
    expect(js.properties?.val?.maximum).toBe(10)
  })

  test('array type with min and max generates minItems and maxItems', () => {
    const js = toJsonSchema({ val: { type: 'array', min: 1, max: 10 } })
    expect(js.properties?.val?.minItems).toBe(1)
    expect(js.properties?.val?.maxItems).toBe(10)
  })

  test('array type with only min generates minItems but not maxItems', () => {
    const js = toJsonSchema({ val: { type: 'array', min: 1 } })
    expect(js.properties?.val?.minItems).toBe(1)
    expect(js.properties?.val?.maxItems).toBeUndefined()
  })

  test('array type with only max generates maxItems but not minItems', () => {
    const js = toJsonSchema({ val: { type: 'array', max: 10 } })
    expect(js.properties?.val?.maxItems).toBe(10)
    expect(js.properties?.val?.minItems).toBeUndefined()
  })

  test('strict: true converts to additionalProperties: false', () => {
    const js = toJsonSchema({ '@': { strict: true }, name: { type: 'string' } })
    expect(js.additionalProperties).toBe(false)
  })

  test('"#" rule with string pattern generates propertyNames.pattern', () => {
    const js = toJsonSchema({ '#': { type: 'string', pattern: '^[a-z]+$' }, name: { type: 'string' } })
    expect(js.propertyNames?.pattern).toBe('^[a-z]+$')
  })

  test('"#" rule with RegExp pattern outputs propertyNames.pattern as string source', () => {
    const js = toJsonSchema({ '#': { type: 'string', pattern: /^[a-z]+$/ }, name: { type: 'string' } })
    expect(js.propertyNames?.pattern).toBe('^[a-z]+$')
  })

  test('"#" rule with special generates propertyNames.format', () => {
    const js = toJsonSchema({ '#': { type: 'string', special: 'email' }, name: { type: 'string' } })
    expect(js.propertyNames?.format).toBe('email')
  })
})
