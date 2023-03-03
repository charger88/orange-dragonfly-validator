const validate = require('./../index')
const input = require('./input.json')
const rules_to_be_failed = require('./rules-to-be-failed.json')
const rules_to_be_passed = require('./rules-to-be-passed.json')

try {
  validate(rules_to_be_failed, input)
  console.log('This is not supposed to happen')
} catch (e) {
  console.error('Expected: Validation failed')
  // console.error(e.message, e.info)
}

try {
  validate(rules_to_be_passed, input)
  console.log('Expected: Validation passed')
} catch (e) {
  console.error('This is not supposed to happen', e.message, e.info)
}
