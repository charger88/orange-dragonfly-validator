import { ODVException, parse } from '../src/index'
import type { ODVRulesSchema } from '../src/index'

const rules: ODVRulesSchema = {
  name: {
    type: 'string',
    pattern: /^[A-Z]([a-z]+)$/,
  },
  position: {
    type: 'string',
  },
  term_ends: {
    type: 'integer',
    min: 2029,
  },
}

function f(input: Record<string, unknown>) {
  try {
    parse(rules, input)
    console.log(`${input.name}'s job as the ${input.position} ends in ${input.term_ends}`)
  } catch (e) {
    console.error((e as ODVException).message, (e as ODVException).info)
  }
}

f({
  name: 'Donald',
  position: 'President of the United States',
  term_ends: 2021,
})

// Output: "Validation failed { term_ends: [ 'Minimal value (length) is 2025. 2021 provided' ] }"

f({
  name: 'Donald',
  position: 'President of the United States',
  term_ends: 2029,
})

// Output: "Donald's job as President of the United States ends in 2029"
