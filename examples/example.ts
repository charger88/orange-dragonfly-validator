import { parse } from '../src/index'
import input from './input.json'
import { rulesToBeFailed, rulesToBePassed } from './example-schemas'

try {
  parse(rulesToBeFailed, input as Record<string, unknown>)
  console.log('This is not supposed to happen')
} catch {
  console.error('Expected: Validation failed')
}

try {
  const data = parse(rulesToBePassed, input as Record<string, unknown>)
  console.log('Expected: Validation passed')
  console.log(`My string's length is ${data['my-string'].length}`)
  console.log('Schema was interpreted correctly, so we know that "my-array" is array and we can reverse it', data['some-array'].reverse())
} catch (e) {
  console.error('This is not supposed to happen', (e as Error).message, (e as Record<string, unknown>).info)
}
