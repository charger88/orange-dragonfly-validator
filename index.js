class ValidationException extends Error {
  info = {}
}

class ValidationRulesException extends ValidationException {}

const EMAIL_PATTERN = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i

const RULES_SCHEMA = {

}

class Validator {

  rules = {}
  strict_mode = true
  patch_mode = false
  exception_mode = true
  errors = {}

  constructor (rules) {
    try {
      //const validator = new Validator(RULES_SCHEMA)
      //validator.exception_mode = false
      //validator.validate(input)
    } catch (e) {
      const err_msg = 'Validation rules are incorrect. See "info" parameter of exception for the details'
      const ex = new ValidationRulesException(err_msg)
      ex.info = e.info
      throw ex
    }
    this.rules = rules
  }

  process (rules, input, errors_prefix = '') {
    let cloned_rules = Object.assign({}, rules)
    let errors_key_prefix
    for (let children_key in input) {
      if (!input.hasOwnProperty(children_key)) continue
      errors_key_prefix = `${errors_prefix}${children_key}`
      if (cloned_rules.hasOwnProperty('#')) this.applyRule(cloned_rules['#'], children_key, `${errors_key_prefix}#key`)
      if (cloned_rules.hasOwnProperty('*')) this.applyRule(cloned_rules['*'], input[children_key], `${errors_key_prefix}`)
    }
    if (this.constructor.getValueType(input) === 'object') {
      if (rules.hasOwnProperty(':strict') ? rules[':strict'] : this.strict_mode) {
        for (let key in input) {
          if (input.hasOwnProperty(key) && !rules.hasOwnProperty(key)) {
            this.errors[errors_prefix + key] = ['Parameter not allowed']
          }
        }
      }
      if (cloned_rules.hasOwnProperty('#')) delete cloned_rules['#']
      if (cloned_rules.hasOwnProperty('*')) delete cloned_rules['*']
      if (cloned_rules.hasOwnProperty(':strict')) delete cloned_rules[':strict']
      let rule
      for (let key in cloned_rules) {
        if (!cloned_rules.hasOwnProperty(key)) continue
        rule = cloned_rules[key]
        if (rule.hasOwnProperty('default') && !input.hasOwnProperty(key)) input[key] = rule['default']
        if (input.hasOwnProperty(key)) {
          this.applyRule(rule, input[key], errors_prefix + key)
        } else if (rule['required']) {
          this.errors[errors_prefix + key] = ['Parameter required']
        }
      }
    }
  }

  static getValueType (value) {
    let value_type = typeof value
    if (value_type === 'object') {
      if (Array.isArray(value)) {
        value_type = 'array'
      } else if (value === null) {
        value_type = null
      }
    } else if ((value_type === 'number') && (parseInt(value) === value)) {
      value_type = 'integer'
    }
    return value_type
  }

  static getValueForMinOrMax (value, value_type) {
    if (value_type === 'array') {
      return Object.keys(value).length
    } else if (value_type === 'string') {
      return value.length
    } else if (['number', 'integer'].includes(value_type)) {
      return value
    } else {
      return null
    }
  }

  applyRule (rule, value, errors_key) {
    if (!this.errors.hasOwnProperty(errors_key)) {
      this.errors[errors_key] = []
    }
    let value_type = this.constructor.getValueType(value)
    const rule_type = rule.hasOwnProperty('type') && rule['type']
      ? (typeof rule['type'] !== 'object' ? [rule['type']] : rule['type'])
      : null
    if (rule_type && rule_type.includes('number')) rule_type.push('integer')
    if ((rule_type !== null) && !rule_type.includes(value_type)) {
      this.errors[errors_key].push(`Incorrect type: ${rule_type.join(' or ')} required, ${value_type} provided`)
      return
    }
    if (value !== null) {
      if (rule.hasOwnProperty('min') || rule.hasOwnProperty('max')) {
        let min_max_value = this.constructor.getValueForMinOrMax(value, value_type)
        if (min_max_value !== null) {
          if (rule.hasOwnProperty('min') && (min_max_value < rule['min'])) this.errors[errors_key].push(`Minimal value (length) is ${rule['min']}. ${min_max_value} provided`)
          if (rule.hasOwnProperty('max') && (min_max_value > rule['max'])) this.errors[errors_key].push(`Maximal value (length) is ${rule['max']}. ${min_max_value} provided`)
        } else {
          const err_msg = 'Validation rules are incorrect. See "info" parameter of exception for the details'
          const ex = new ValidationRulesException(err_msg)
          ex.info[errors_key] = `${value_type} can not be validated for "min" and "max"`
          throw ex
        }
      }
      if (rule['in'] && !rule['in'].includes(value)) this.errors[errors_key].push('Value is not allowed' + (rule['in:public'] ? `. Allowed values are: "${(rule['in:public'] === true ? rule['in'] : rule['in:public']).join('", "')}"` : ''))
      if (rule['pattern'] || rule['special']) {
        if (value_type !== 'string') {
          this.errors[errors_key].push(`Incorrect type for "pattern" filter`)
        } else {
          if (rule['special']) {
            if (rule['special'] === 'email') {
              if (!EMAIL_PATTERN.test(value)) this.errors[errors_key].push(`Incorrect email`)
            }
            // TODO URL, phone number, uuidV4, etc.
          }
          if (!rule['pattern'].test(value)) this.errors[errors_key].push(`Incorrect string format`)
        }
      }
      if (rule['children']) {
        if ((value_type === 'object') || (value_type === 'array')) {
          this.process(rule['children'], value, `${errors_key}.`)
        } else {
          if (rule_type.filter(t => !['object', 'array'].includes(t)).length === 0) {
            const err_msg = 'Validation rules are incorrect. See "info" parameter of exception for the details'
            const ex = new ValidationRulesException(err_msg)
            ex.info[errors_key] = `Can\'t validate children of type ${t}`
            throw ex
          }
        }
      }
    }
    if (this.errors[errors_key].length === 0) {
      delete this.errors[errors_key]
    }
  }

  validate (input, errors_prefix = '') {
    this.process(this.rules, input, errors_prefix)
    if (Object.keys(this.errors).length) {
      if (this.exception_mode) {
        const err_msg = 'Validation failed'
        const ex = new ValidationException(err_msg)
        ex.info = this.errors
        throw ex
      }
      return false
    }
    return true
  }

}

const validate = function (rules, input, options={}) {
  const validator = new Validator(rules)
  if (options.hasOwnProperty('strict')) validator.strict_mode = options['strict']
  if (options.hasOwnProperty('patch')) validator.patch_mode = options['patch']
  if (options.hasOwnProperty('exception')) validator.exception_mode = options['exception']
  return validator.validate(input, options.hasOwnProperty('errors_prefix') ? options['errors_prefix'] : '')
}

module.exports = validate
