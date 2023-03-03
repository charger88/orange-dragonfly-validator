class ValidationException extends Error {
  get info () {
    return this._info || {}
  }

  set info (value) {
    this._info = value
  }
}

class ValidationRulesException extends ValidationException {}

const EMAIL_PATTERN = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i // eslint-disable-line no-useless-escape

const RULES_SCHEMA = {
  '@': {
    strict: false
  },
  '#': {
    type: 'string'
  },
  '*': {
    type: 'object',
    children: {
      '@': {
        strict: true
      },
      type: {
        type: ['array'],
        in: ['string', 'number', 'integer', 'array', 'object', 'boolean', 'function', 'null'],
        'in:public': true
      },
      per_type: {
        '#': {
          type: 'string',
          in: ['string', 'number', 'integer', 'array', 'object', 'boolean', 'function', 'null'],
          'in:public': true
        },
        '*': {
          type: 'object',
          children: {
            in: {
              type: ['array']
            },
            'in:public': {
              type: ['array', 'boolean']
            },
            min: {
              type: ['integer']
            },
            max: {
              type: ['integer']
            },
            pattern: {
              type: ['object', 'string']
            },
            special: {
              type: ['string']
            },
            transform: {
              type: ['function']
            },
            apply_transformed: {
              type: ['boolean']
            },
            children: {
              type: ['object']
            }
          }
        }
      },
      in: {
        type: ['array']
      },
      'in:public': {
        type: ['array', 'boolean']
      },
      min: {
        type: ['integer']
      },
      max: {
        type: ['integer']
      },
      required: {
        type: ['boolean']
      },
      pattern: {
        type: ['object', 'string']
      },
      special: {
        type: ['string']
      },
      transform: {
        type: ['function']
      },
      apply_transformed: {
        type: ['boolean']
      },
      default: {},
      children: {
        type: ['object']
      }
    }
  }
}

const RULES_OPTIONS_SCHEMA = {
  strict: {
    type: ['boolean']
  }
}

class Validator {
  constructor (rules) {
    this.rules = rules
    this.strict_mode = true
    this.exception_mode = true
    this.internal_call = false
    this.errors = {}
  }

  static validationRulesError (err_msg, info) {
    const ex = new ValidationRulesException(`${err_msg}. See "info" parameter of exception for the details`)
    ex.info = info
    throw ex
  }

  static validateRules (rules) {
    const cloned_rules = Object.assign({}, rules)
    if ('#' in cloned_rules) {
      cloned_rules['>>>#'] = cloned_rules['#']
      delete cloned_rules['#']
    }
    if ('*' in cloned_rules) {
      cloned_rules['>>>*'] = cloned_rules['*']
      delete cloned_rules['*']
    }
    if ('@' in cloned_rules) {
      try {
        const validator = new Validator(RULES_OPTIONS_SCHEMA)
        validator.strict_mode = true
        validator.internal_call = true
        validator.validate(cloned_rules['@'])
      } catch (e) {
        this.validationRulesError('Validation rules options are incorrect', e.info)
      }
      delete cloned_rules['@']
    }
    try {
      const validator = new Validator(RULES_SCHEMA)
      validator.strict_mode = false
      validator.internal_call = true
      validator.validate(cloned_rules)
    } catch (e) {
      this.validationRulesError('Validation rules are incorrect', e.info)
    }
  }

  static normalizeRules (rules) {
    for (const key in rules) {
      if (!(key in rules)) continue
      if ('type' in rules[key]) {
        rules[key].type = rules[key].type ? (typeof rules[key].type !== 'object' ? [rules[key].type] : rules[key].type) : null
        if (rules[key].type) {
          if (rules[key].type.includes('number')) rules[key].type.push('integer')
        }
      }
    }
  }

  process (rules, input, errors_prefix = '') {
    const cloned_rules = Object.assign({}, rules)
    this.constructor.normalizeRules(rules)
    if (!this.internal_call) {
      this.constructor.validateRules(rules)
    }
    let errors_key_prefix
    for (const children_key in input) {
      if (!(children_key in input)) continue
      errors_key_prefix = `${errors_prefix}${children_key}`
      if ('#' in cloned_rules) this.applyRule(cloned_rules['#'], children_key, `${errors_key_prefix}#key`)
      if ('*' in cloned_rules) {
        const processed_value = this.applyRule(cloned_rules['*'], input[children_key], `${errors_key_prefix}`)
        if (cloned_rules['*'].apply_transformed) {
          input[children_key] = processed_value
        }
      }
    }
    if (this.constructor.getValueType(input) === 'object') {
      if (('@' in rules) && ('strict' in rules['@']) ? rules['@'].strict : this.strict_mode) {
        for (const key in input) {
          if ((key in input) && !(key in rules)) {
            this.errors[errors_prefix + key] = ['Parameter not allowed']
          }
        }
      }
      if ('#' in cloned_rules) delete cloned_rules['#']
      if ('*' in cloned_rules) delete cloned_rules['*']
      if ('@' in cloned_rules) delete cloned_rules['@']
      let rule
      for (const key in cloned_rules) {
        if (!(key in cloned_rules)) continue
        rule = cloned_rules[key]
        if (('default' in rule) && !(key in input)) input[key] = rule.default
        if (key in input) {
          const processed_value = this.applyRule(rule, input[key], errors_prefix + key)
          if (rule.apply_transformed) {
            input[key] = processed_value
          }
        } else if (rule.required) {
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
        value_type = 'null'
      }
    } else if ((value_type === 'number') && Number.isInteger(value)) {
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

  applyRule (original_rule, original_value, errors_key) {
    if (!(errors_key in this.errors)) {
      this.errors[errors_key] = []
    }
    const rule = { ...original_rule }
    const value = 'transform' in rule ? rule.transform(original_value) : original_value
    const value_type = this.constructor.getValueType(value)
    if (('type' in rule) && (rule.type !== null) && !rule.type.includes(value_type)) {
      this.errors[errors_key].push(`Incorrect type: ${rule.type.join(' or ')} required, ${value_type} provided`)
      return value
    }
    if (('per_type' in rule) && rule.per_type && (value_type in rule.per_type)) {
      Object.assign(rule, rule.per_type[value_type])
    }
    if (value !== null) {
      if (('min' in rule) || ('max' in rule)) {
        const min_max_value = this.constructor.getValueForMinOrMax(value, value_type)
        if (min_max_value !== null) {
          if (('min' in rule) && (min_max_value < rule.min)) this.errors[errors_key].push(`Minimal value (length) is ${rule.min}. ${min_max_value} provided`)
          if (('max' in rule) && (min_max_value > rule.max)) this.errors[errors_key].push(`Maximal value (length) is ${rule.max}. ${min_max_value} provided`)
        } else if (!('type' in rule) || (rule.type === null) || (rule.type.length < 2)) {
          const info = {}
          info[errors_key] = `${value_type} can not be validated for "min" and "max"`
          this.constructor.validationRulesError('Validation rules are incorrect', info)
        }
      }
      if (rule.in) {
        if (value_type === 'object') {
          const info = {}
          info[errors_key] = '"in" directive is not applicable for objects'
          this.constructor.validationRulesError('Validation rules are incorrect', info)
        } else if (value_type === 'array') {
          if (value.filter(v => !rule.in.includes(v)).length) {
            this.errors[errors_key].push('Some of provided values in array are not allowed' + (rule['in:public'] ? `. Allowed values are: "${(rule['in:public'] === true ? rule.in : rule['in:public']).join('", "')}"` : ''))
          }
        } else {
          if (!rule.in.includes(value)) {
            this.errors[errors_key].push('Provided value is not allowed' + (rule['in:public'] ? `. Allowed values are: "${(rule['in:public'] === true ? rule.in : rule['in:public']).join('", "')}"` : ''))
          }
        }
      }
      if (rule.pattern || rule.special) {
        if (value_type !== 'string') {
          this.errors[errors_key].push('Incorrect type for "pattern" filter')
        } else {
          if (rule.special) {
            if (rule.special === 'email') {
              if (!EMAIL_PATTERN.test(value)) this.errors[errors_key].push('Incorrect email')
            }
            // TODO URL, phone number, uuidV4, etc.
          }
          if (rule.pattern) {
            const expression = (typeof rule.pattern === 'string') ? new RegExp(rule.pattern) : rule.pattern
            if (!expression.test(value)) this.errors[errors_key].push('Incorrect string format')
          }
        }
      }
      if (rule.children) {
        if ((value_type === 'object') || (value_type === 'array')) {
          this.process(rule.children, value, `${errors_key}.`)
        } else {
          if (rule.type.filter(t => !['object', 'array'].includes(t)).length === 0) {
            const info = {}
            info[errors_key] = `Can't validate children of type ${value_type}`
            this.constructor.validationRulesError('Validation rules are incorrect', info)
          }
        }
      }
    }
    if (this.errors[errors_key].length === 0) {
      delete this.errors[errors_key]
    }
    return value
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

const validate = function (rules, input, options = {}) {
  const validator = new Validator(rules)
  if ('strict' in options) validator.strict_mode = options.strict
  if ('exception' in options) validator.exception_mode = options.exception
  return validator.validate(input, 'errors_prefix' in options ? options.errors_prefix : '')
}

module.exports = validate
