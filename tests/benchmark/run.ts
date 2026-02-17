import { ODVRules, ODVRulesSchema, ODVValidator } from '../../src'
import { inputs } from './inputs'

const t = Date.now()

const TOTAL = 100000
const INITS = 100
const PER_INIT = TOTAL / INITS

const SCHEMA = {
    first_name: { required: true, type: 'string', min: 1, max: 64 },
    last_name: { required: true, type: 'string', min: 1, max: 64 },
    gender: { required: true, type: 'string', in: ['male', 'female', 'nonbinary'] },
    vaccinated: { required: true, type: 'boolean' },
    perks: { required: true, type: 'array', children: { '*': { type: 'string', min: 1, max: 10 } } },
    comment: { type: 'string' },
} as const satisfies ODVRulesSchema

for (let i = 0; i < INITS; i++) {
  const validatorRules = new ODVRules(SCHEMA)
  const validator = new ODVValidator(validatorRules, { exceptionMode: false })
    for (let j = 0; j < PER_INIT; j++) {
        for (const input of inputs) {
            validator.validate(input)
        }
    }
}

console.log(Date.now() - t, 'ms')
console.log(process.memoryUsage())