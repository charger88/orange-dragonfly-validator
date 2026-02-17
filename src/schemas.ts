// The meta-schema uses RulesSchema features (like # and *) recursively
// to validate user-provided rule definitions, so it needs a cast.
export const RULES_SCHEMA = {
  '@': {
    strict: false,
  },
  '#': {
    type: 'string',
  },
  '*': {
    type: 'object',
    children: {
      '@': {
        strict: true,
      },
      type: {
        type: ['array'],
        in: ['string', 'number', 'integer', 'array', 'object', 'boolean', 'function', 'null'],
        'in:public': true,
      },
      per_type: {
        '#': {
          type: 'string',
          in: ['string', 'number', 'integer', 'array', 'object', 'boolean', 'function', 'null'],
          'in:public': true,
        },
        '*': {
          type: 'object',
          children: {
            in: {
              type: ['array'],
            },
            'in:public': {
              type: ['array', 'boolean'],
            },
            min: {
              type: ['number'],
            },
            max: {
              type: ['number'],
            },
            pattern: {
              type: ['object', 'string'],
            },
            special: {
              type: ['string'],
              in: ['email', 'phone', 'us-phone', 'url', 'uuid', 'ipv4', 'date', 'datetime', 'hex-color'],
              'in:public': true,
            },
            transform: {
              type: ['function'],
            },
            apply_transformed: {
              type: ['boolean'],
            },
            children: {
              type: ['object'],
            },
          },
        },
      },
      in: {
        type: ['array'],
      },
      'in:public': {
        type: ['array', 'boolean'],
      },
      min: {
        type: ['number'],
      },
      max: {
        type: ['number'],
      },
      required: {
        type: ['boolean'],
      },
      pattern: {
        type: ['object', 'string'],
      },
      special: {
        type: ['string'],
        in: ['email', 'phone', 'us-phone', 'url', 'uuid', 'ipv4', 'date', 'datetime', 'hex-color'],
        'in:public': true,
      },
      transform: {
        type: ['function'],
      },
      apply_transformed: {
        type: ['boolean'],
      },
      default: {},
      children: {
        type: ['object'],
      },
    },
  },
}

export const RULES_OPTIONS_SCHEMA = {
  strict: {
    type: ['boolean'],
  },
}
