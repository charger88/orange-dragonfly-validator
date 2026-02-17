import { parse, safeParse, ODVSchemaBuilder, ODVValidator, ODVException } from '../src/index'

// --- Basic usage ---

const userSchema = ODVSchemaBuilder.create()
  .property('name', p => p.required().string().min(1).max(100))
  .property('email', p => p.required().string().special('email'))
  .property('age', p => p.integer().min(0).max(150))
  .property('role', p => p.string().in(['admin', 'user', 'guest']).default('guest'))
  .toSchema()

try {
  const user = parse(userSchema, {
    name: 'Alice',
    email: 'alice@example.com',
    age: 30,
  }, { strictMode: false })
  console.log('User validated:', user)
  // { name: 'Alice', email: 'alice@example.com', age: 30, role: 'guest' }
} catch (e) {
  console.error('Unexpected error:', (e as Error).message)
}

// --- safeParse ---

const result = safeParse(userSchema, { name: 'Bob' }, { strictMode: false })
if (result.success) {
  console.log('Valid:', result.data)
} else {
  console.log('Errors:', result.errors)
  // email is required
}

// --- Nested schemas ---

const apiSchema = ODVSchemaBuilder.create()
  .property('users', p => p.required().array().min(1)
    .children(c => c
      .wildcard(p => p.object()
        .children(c => c
          .property('name', p => p.required().string())
          .property('role', p => p.string().in(['admin', 'user'])),
        ),
      ),
    ),
  )
  .property('settings', p => p.object()
    .children(c => c
      .strict(false)
      .keyValidator(p => p.pattern(/^[a-z_]+$/))
      .wildcard(p => p.string().max(255)),
    ),
  )
  .toSchema()

try {
  const data = parse(apiSchema, {
    users: [
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'user' },
    ],
    settings: {
      theme: 'dark',
      language: 'en',
    },
  }, { strictMode: false })
  console.log('API data validated:', JSON.stringify(data, null, 2))
} catch (e) {
  if (e instanceof ODVException) {
    console.error('Validation failed:', e.info)
  }
}

// --- Multi-type with per-type rules ---

const flexSchema = ODVSchemaBuilder.create()
  .property('value', p => p.string().number()
    .perType('string', p => p.min(1).max(255))
    .perType('number', p => p.min(0).max(99999)),
  )
  .toSchema()

console.log('String value:', parse(flexSchema, { value: 'hello' }, { strictMode: false }))
console.log('Number value:', parse(flexSchema, { value: 42 }, { strictMode: false }))

// --- Transform ---

const formSchema = ODVSchemaBuilder.create()
  .property('email', p => p.required().string().special('email')
    .transform(v => typeof v === 'string' ? v.toLowerCase().trim() : v)
    .applyTransformed(),
  )
  .property('score', p => p.integer().min(0).max(100)
    .transform(v => typeof v === 'string' ? parseInt(v, 10) : v)
    .applyTransformed(),
  )
  .toSchema()

const formData = parse(formSchema, {
  email: '  ALICE@EXAMPLE.COM  ',
  score: '95',
}, { strictMode: false })
console.log('Transformed:', formData)
// { email: 'alice@example.com', score: 95 }

// --- Passing ODVRules directly to parse ---

const contactRules = ODVSchemaBuilder.create()
  .property('name', p => p.required().string().min(1))
  .property('phone', p => p.string().special('phone'))
  .complete()

// parse() and safeParse() accept ODVRules directly — no .toSchema() needed
const contact = parse(contactRules, {
  name: 'Alice',
  phone: '+12025551234',
}, { strictMode: false })
console.log('Contact (via ODVRules):', contact)

const contactResult = safeParse(contactRules, { name: 'Bob' }, { strictMode: false })
console.log('safeParse with ODVRules:', contactResult)

// --- Using complete() with ODVValidator ---

const rules = ODVSchemaBuilder.create()
  .property('name', p => p.required().string())
  .property('age', p => p.integer().min(0))
  .complete()

const validator = new ODVValidator(rules, { exceptionMode: false, strictMode: false })

if (validator.validate({ name: 'Alice', age: 25 })) {
  console.log('Valid data:', validator.data)
} else {
  console.log('Errors:', validator.errors)
}
