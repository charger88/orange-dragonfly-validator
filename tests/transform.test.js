/* eslint-disable no-undef */

const validate = require('../index')

test('transformation works', () => {
  const input = { val: '5' }
  expect(validate({ val: { type: 'integer' } }, input, { exception: false })).toBe(false)
  expect(input.val).toBe('5')
  expect(validate({ val: { type: 'integer', transform: (v) => parseInt(v, 10) } }, input, { exception: false })).toBe(true)
  expect(input.val).toBe('5')
})

test('transformation applied', () => {
  const input = { val: '5' }
  expect(validate({ val: { type: 'integer', transform: (v) => parseInt(v, 10), apply_transformed: true } }, input, { exception: false })).toBe(true)
  expect(input.val).not.toBe('5')
  expect(input.val).toBe(5)
})
