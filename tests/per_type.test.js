/* eslint-disable no-undef */

const validate = require('../index')

const RULES = {
  val: {
    type: ['integer', 'string', 'array'],
    per_type: {
      integer: {
        max: 100
      },
      string: {
        max: 15
      },
      array: {
        max: 1
      }
    }
  }
}

test('per_type works', () => {
  expect(validate(RULES, { val: 99 }, { exception: false })).toBe(true)
  expect(validate(RULES, { val: '99999' }, { exception: false })).toBe(true)
  expect(validate(RULES, { val: 'This is test' }, { exception: false })).toBe(true)
  expect(validate(RULES, { val: [555] }, { exception: false })).toBe(true)
  expect(validate(RULES, { val: 101 }, { exception: false })).toBe(false)
  expect(validate(RULES, { val: '0000000000000000000000000' }, { exception: false })).toBe(false)
  expect(validate(RULES, { val: [1, 2] }, { exception: false })).toBe(false)
})
