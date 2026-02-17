import { parse, safeParse, ODVException, ODVSchemaBuilder, ODVPropertyBuilder, ODVValidator, ODVRules } from '../src/index'

const opts = { strictMode: false } as const

describe('ODVPropertyBuilder', () => {
  test('builds empty rule from empty builder', () => {
    const rule = new ODVPropertyBuilder()._build()
    expect(rule).toEqual({})
  })

  test('builds single type', () => {
    const rule = new ODVPropertyBuilder().string()._build()
    expect(rule).toEqual({ type: 'string' })
  })

  test('builds multiple types as array', () => {
    const rule = new ODVPropertyBuilder().string().integer()._build()
    expect(rule).toEqual({ type: ['string', 'integer'] })
  })

  test('builds type via .type() with single value', () => {
    const rule = new ODVPropertyBuilder().type('boolean')._build()
    expect(rule).toEqual({ type: 'boolean' })
  })

  test('builds type via .type() with array', () => {
    const rule = new ODVPropertyBuilder().type(['string', 'null'])._build()
    expect(rule).toEqual({ type: ['string', 'null'] })
  })

  test('builds all constraint methods', () => {
    const rule = new ODVPropertyBuilder()
      .required()
      .default('test')
      .min(1)
      .max(100)
      .pattern(/^[a-z]+$/)
      .special('email')
      ._build()

    expect(rule.required).toBe(true)
    expect(rule.default).toBe('test')
    expect(rule.min).toBe(1)
    expect(rule.max).toBe(100)
    expect(rule.pattern).toEqual(/^[a-z]+$/)
    expect(rule.special).toBe('email')
  })

  test('builds in and inPublic', () => {
    const rule = new ODVPropertyBuilder()
      .in(['a', 'b', 'c'])
      .inPublic(['a', 'b'])
      ._build()

    expect(rule.in).toEqual(['a', 'b', 'c'])
    expect(rule['in:public']).toEqual(['a', 'b'])
  })

  test('builds inPublic with boolean', () => {
    const rule = new ODVPropertyBuilder().in([1, 2]).inPublic(true)._build()
    expect(rule['in:public']).toBe(true)
  })

  test('builds transform and applyTransformed', () => {
    const fn = (v: unknown) => String(v)
    const rule = new ODVPropertyBuilder().transform(fn).applyTransformed()._build()
    expect(rule.transform).toBe(fn)
    expect(rule.apply_transformed).toBe(true)
  })

  test('builds children', () => {
    const rule = new ODVPropertyBuilder()
      .object()
      .children(c => c.property('name', p => p.required().string()))
      ._build()

    expect(rule.type).toBe('object')
    expect(rule.children).toEqual({
      name: { type: 'string', required: true },
    })
  })

  test('builds perType', () => {
    const rule = new ODVPropertyBuilder()
      .string().number()
      .perType('string', p => p.min(1).max(255))
      .perType('number', p => p.min(0).max(1000))
      ._build()

    expect(rule.type).toEqual(['string', 'number'])
    expect(rule.per_type).toEqual({
      string: { min: 1, max: 255 },
      number: { min: 0, max: 1000 },
    })
  })

  test('_buildPerType strips type, required, default, per_type', () => {
    const rule = new ODVPropertyBuilder()
      .string()
      .required()
      .default('x')
      .min(1)
      ._buildPerType()

    expect(rule).toEqual({ min: 1 })
    expect('type' in rule).toBe(false)
    expect('required' in rule).toBe(false)
    expect('default' in rule).toBe(false)
  })
})

describe('ODVSchemaBuilder', () => {
  test('builds empty schema', () => {
    const schema = new ODVSchemaBuilder().toSchema()
    expect(schema).toEqual({})
  })

  test('static create() returns builder', () => {
    const builder = ODVSchemaBuilder.create()
    expect(builder).toBeInstanceOf(ODVSchemaBuilder)
  })

  test('builds schema with properties', () => {
    const schema = new ODVSchemaBuilder()
      .property('name', p => p.required().string())
      .property('age', p => p.integer())
      .toSchema()

    expect(schema).toEqual({
      name: { type: 'string', required: true },
      age: { type: 'integer' },
    })
  })

  test('builds wildcard rule', () => {
    const schema = new ODVSchemaBuilder()
      .wildcard(p => p.string().max(100))
      .toSchema()

    expect(schema['*']).toEqual({ type: 'string', max: 100 })
  })

  test('builds key validator', () => {
    const schema = new ODVSchemaBuilder()
      .keyValidator(p => p.pattern(/^[a-z]+$/))
      .toSchema()

    expect(schema['#']).toEqual({ pattern: /^[a-z]+$/ })
  })

  test('builds strict mode on', () => {
    const schema = new ODVSchemaBuilder().strict().toSchema()
    expect(schema['@']).toEqual({ strict: true })
  })

  test('builds strict mode off', () => {
    const schema = new ODVSchemaBuilder().strict(false).toSchema()
    expect(schema['@']).toEqual({ strict: false })
  })

  test('complete() returns ODVRules', () => {
    const rules = new ODVSchemaBuilder()
      .property('name', p => p.string())
      .complete()

    expect(rules).toBeDefined()
    expect(rules.schema).toEqual({ name: { type: 'string' } })
  })
})

describe('Builder integration with parse', () => {
  test('basic validation passes', () => {
    const schema = ODVSchemaBuilder.create()
      .property('name', p => p.required().string().min(1))
      .property('age', p => p.integer().min(0))
      .toSchema()

    const data = parse(schema, { name: 'Alice', age: 30 }, opts)
    expect(data.name).toBe('Alice')
  })

  test('basic validation fails on missing required', () => {
    const schema = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .toSchema()

    expect(() => parse(schema, {}, opts)).toThrow(ODVException)
  })

  test('default values work', () => {
    const schema = ODVSchemaBuilder.create()
      .property('role', p => p.string().default('user'))
      .toSchema()

    const data = parse(schema, {}, opts)
    expect(data.role).toBe('user')
  })

  test('special validators work', () => {
    const schema = ODVSchemaBuilder.create()
      .property('email', p => p.required().string().special('email'))
      .toSchema()

    const data = parse(schema, { email: 'test@example.com' }, opts)
    expect(data.email).toBe('test@example.com')

    expect(() => parse(schema, { email: 'not-an-email' }, opts)).toThrow(ODVException)
  })

  test('in constraint works', () => {
    const schema = ODVSchemaBuilder.create()
      .property('status', p => p.string().in(['active', 'inactive']))
      .toSchema()

    const data = parse(schema, { status: 'active' }, opts)
    expect(data.status).toBe('active')

    expect(() => parse(schema, { status: 'deleted' }, opts)).toThrow(ODVException)
  })

  test('pattern works', () => {
    const schema = ODVSchemaBuilder.create()
      .property('code', p => p.string().pattern(/^[A-Z]{3}$/))
      .toSchema()

    const data = parse(schema, { code: 'ABC' }, opts)
    expect(data.code).toBe('ABC')

    expect(() => parse(schema, { code: 'abc' }, opts)).toThrow(ODVException)
  })

  test('transform with applyTransformed works', () => {
    const schema = ODVSchemaBuilder.create()
      .property('value', p => p.integer()
        .transform(v => typeof v === 'string' ? parseInt(v, 10) : v)
        .applyTransformed(),
      )
      .toSchema()

    const data = parse(schema, { value: '42' }, opts)
    expect(data.value).toBe(42)
  })

  test('nested object children work', () => {
    const schema = ODVSchemaBuilder.create()
      .property('user', p => p.required().object()
        .children(c => c
          .property('name', p => p.required().string())
          .property('email', p => p.string().special('email')),
        ),
      )
      .toSchema()

    const data = parse(schema, {
      user: { name: 'Alice', email: 'alice@example.com' },
    }, opts)
    expect(data.user).toBeDefined()
  })

  test('nested array children work', () => {
    const schema = ODVSchemaBuilder.create()
      .property('tags', p => p.required().array().min(1)
        .children(c => c.wildcard(p => p.string())),
      )
      .toSchema()

    const data = parse(schema, { tags: ['a', 'b', 'c'] }, opts)
    expect(data.tags).toEqual(['a', 'b', 'c'])

    expect(() => parse(schema, { tags: [] }, opts)).toThrow(ODVException)
  })

  test('deeply nested schemas work', () => {
    const schema = ODVSchemaBuilder.create()
      .property('users', p => p.required().array()
        .children(c => c
          .wildcard(p => p.object()
            .children(c => c
              .property('name', p => p.required().string())
              .property('role', p => p.string().in(['admin', 'user'])),
            ),
          ),
        ),
      )
      .toSchema()

    const data = parse(schema, {
      users: [
        { name: 'Alice', role: 'admin' },
        { name: 'Bob', role: 'user' },
      ],
    }, opts)
    expect(data.users).toHaveLength(2)
  })

  test('per-type rules work', () => {
    const schema = ODVSchemaBuilder.create()
      .property('value', p => p.string().number()
        .perType('string', p => p.min(1).max(10))
        .perType('number', p => p.min(0).max(1000)),
      )
      .toSchema()

    const data1 = parse(schema, { value: 'hello' }, opts)
    expect(data1.value).toBe('hello')

    const data2 = parse(schema, { value: 42 }, opts)
    expect(data2.value).toBe(42)

    expect(() => parse(schema, { value: '' }, opts)).toThrow(ODVException)
  })

  test('wildcard and keyValidator work', () => {
    const schema = ODVSchemaBuilder.create()
      .strict(false)
      .keyValidator(p => p.pattern(/^[a-z]+$/))
      .wildcard(p => p.string())
      .toSchema()

    const data = parse(schema, { hello: 'world', foo: 'bar' })
    expect(data).toBeDefined()

    expect(() => parse(schema, { UPPER: 'bad' })).toThrow(ODVException)
  })

  test('strict mode rejects extra keys', () => {
    const schema = ODVSchemaBuilder.create()
      .property('name', p => p.string())
      .strict()
      .toSchema()

    expect(() => parse(schema, { name: 'Alice', extra: 'bad' })).toThrow(ODVException)
  })

  test('strict(false) allows extra keys', () => {
    const schema = ODVSchemaBuilder.create()
      .property('name', p => p.string())
      .strict(false)
      .toSchema()

    const data = parse(schema, { name: 'Alice', extra: 'ok' })
    expect(data.name).toBe('Alice')
  })

  test('nullable type works', () => {
    const schema = ODVSchemaBuilder.create()
      .property('value', p => p.string().null())
      .toSchema()

    const data = parse(schema, { value: null }, opts)
    expect(data.value).toBeNull()
  })
})

describe('parse/safeParse accept ODVRules directly', () => {
  test('parse accepts ODVRules instance', () => {
    const rules = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .complete()

    const data = parse(rules, { name: 'Alice' }, opts)
    expect(data.name).toBe('Alice')
  })

  test('parse with ODVRules throws on validation failure', () => {
    const rules = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .complete()

    expect(() => parse(rules, {}, opts)).toThrow(ODVException)
  })

  test('parse accepts manually constructed ODVRules', () => {
    const rules = new ODVRules({ name: { type: 'string', required: true } } as const)
    const data = parse(rules, { name: 'Bob' }, opts)
    expect(data.name).toBe('Bob')
  })

  test('safeParse accepts ODVRules instance', () => {
    const rules = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .complete()

    const result = safeParse(rules, { name: 'Alice' }, opts)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
    }
  })

  test('safeParse with ODVRules returns failure', () => {
    const rules = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .complete()

    const result = safeParse(rules, {}, opts)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name).toBeDefined()
    }
  })

  test('parse with ODVRules applies defaults', () => {
    const rules = ODVSchemaBuilder.create()
      .property('role', p => p.string().default('user'))
      .complete()

    const data = parse(rules, {}, opts)
    expect(data.role).toBe('user')
  })

  test('parse with ODVRules and nested children', () => {
    const rules = ODVSchemaBuilder.create()
      .property('users', p => p.required().array()
        .children(c => c
          .wildcard(p => p.object()
            .children(c => c
              .property('name', p => p.required().string()),
            ),
          ),
        ),
      )
      .complete()

    const data = parse(rules, { users: [{ name: 'Alice' }] }, opts)
    expect(data.users).toHaveLength(1)
  })
})

describe('Builder integration with safeParse', () => {
  test('safeParse success', () => {
    const schema = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .toSchema()

    const result = safeParse(schema, { name: 'Alice' }, opts)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
    }
  })

  test('safeParse failure', () => {
    const schema = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .toSchema()

    const result = safeParse(schema, {}, opts)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors.name).toBeDefined()
    }
  })
})

describe('Builder integration with ODVValidator', () => {
  test('complete() works with ODVValidator', () => {
    const rules = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .property('age', p => p.integer().min(0))
      .complete()

    const validator = new ODVValidator(rules, { exceptionMode: false, strictMode: false })
    const valid = validator.validate({ name: 'Alice', age: 25 })
    expect(valid).toBe(true)
    expect(validator.data).toEqual({ name: 'Alice', age: 25 })
  })

  test('complete() validator detects errors', () => {
    const rules = ODVSchemaBuilder.create()
      .property('name', p => p.required().string())
      .complete()

    const validator = new ODVValidator(rules, { exceptionMode: false, strictMode: false })
    const valid = validator.validate({})
    expect(valid).toBe(false)
    expect(validator.errors.name).toBeDefined()
  })
})
