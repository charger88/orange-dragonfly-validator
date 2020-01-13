# Orange Dragonfly Validator

One day Orange Dragonfly will become a NodeJS framework. For now I'm starting to publish its components.

This library is created for input parameters' validation.

## How it works?

You have input in some object (Input). You have another object with schema of allowed input (Schema).

Schema describes available Input and there are any issues throwing an exception which contains information about the errors in the Input.

### Simple example which explains the idea

```javascript
const validate = require("orange-dragonfly-validator")

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
    "min": 2025
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
```

## Configuration

### Rule definition

There is no required params in rule's definition.

* __type__ (`string` or `array`): describes allowed types of the parameter. Allowed values: `string`, `number`, `integer`, `array`, `object`, `boolean`.
* __in__ (`array`): describes allowed values.
* __in:public__ (`boolean` or `array`): if `true` error message of `in` property will have list of available values. If `array` is provided if will be provided in error message of `in` instead of `in` values. For example it may be used if some of available values is deprecated and should not be exposed to users.
* __min__ (`integer`): minimal (length of) value (applicable for `integer`, `number`, `string` and `array` values).
* __max__ (`integer`): maximal (length of) value (applicable for `integer`, `number`, `string` and `array` values).
* __required__ (`boolean`): show is value required or not.
* __pattern__ (`RegExp`): RegExp object.
* __default__ (any type): default value. It will ve added to the Input if it is not provided.
* __children__ (`object`): description of children value (applicable for `array` and `object`).
    * __#__ (rule object): rule for `object` key validation. Applicable for root of the schema as well.
    * __*__ (rule object): rule for all values of `object` or `array`. Applicable for root of the schema as well.
    * __%key%__ (rule object): rule for specific `object` key's value. Applicable for root of the schema as well (it is how you define rules).
    * __@__ (`object`): options. Applicable for root of the schema as well.
        * __strict__ (`boolean`): in strict mode validator does not allow in Input keys not defined in Rules (default is `true`, but it can also be overridden in `options` argument of `validate` function) 