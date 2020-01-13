const validate = require("./../index")

const rules = {
  "name": {
    "type": "string",
    "pattern": /^[A-Z]([a-z]+)$/
  },
  "position": {
    "type": "string"
  },
  "term_ends": {
    "type": "integer",
    "min": 2025,
  }
}

function f(input) {
  try {
    validate(rules, input)
    console.log(`${input.name}'s job as ${input.position} ends in ${input.term_ends}`)
  } catch (e) {
    console.error(e.message, e.info)
  }
}

f({
  "name": "Donald",
  "position": "President of the United States",
  "term_ends": 2021
})

// Output: "Validation failed { term_ends: [ 'Minimal value (length) is 2025. 2021 provided' ] }"

f({
  "name": "Donald",
  "position": "President of the United States",
  "term_ends": 2025
})

// Output: "Donald's job as President of the United States ends in 2025"