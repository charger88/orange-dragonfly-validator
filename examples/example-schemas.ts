import type { ODVRulesSchema } from '../src/index'

export const rulesToBePassed = {
  'my-integer': {
    type: 'integer',
  },
  'can-be-null': {
    required: true,
    type: ['integer', 'null'],
    default: null,
  },
  'my-string': {
    required: true,
    type: ['string'],
  },
  'type': {
    type: ['object'],
  },
  'extra-property': {},
  'some-array': {
    required: true,
    type: ['array'],
    min: 1,
    max: 10,
    children: {
      '*': {
        type: ['string'],
      },
    },
  },
  'some-object': {
    required: true,
    type: ['object'],
    children: {
      '@': {
        strict: false,
      },
      '#': {
        type: 'string',
        pattern: '^([a-z]+)$',
      },
      '*': {
        type: 'object',
        children: {
          color: {
            required: true,
            type: 'string',
          },
          type: {
            required: true,
            in: ['fruit', 'vegetable'],
          },
        },
      },
    },
  },
} as const satisfies ODVRulesSchema

export const rulesToBeFailed = {
  'my-integer': {
    type: 'array',
  },
  'can-be-null': {
    type: ['null'],
  },
  'my-string': {
    required: true,
    type: 'integer',
    default: 123,
  },
  'type': {
    type: 'array',
  },
  'missing-property': {
    required: true,
    type: 'integer',
  },
  'some-array': {
    required: true,
    type: 'array',
    min: 10,
    max: 1,
    children: {
      '*': {
        type: 'integer',
      },
    },
  },
  'some-object': {
    required: true,
    type: 'object',
    children: {
      '#': {
        type: 'string',
        pattern: '^([A-Z]+)$',
      },
      '*': {
        type: 'object',
        children: {
          color: {
            type: 'integer',
          },
          type: {
            in: ['tree', 'vegetable', 'possum'],
            'in:public': ['tree', 'vegetable'],
          },
        },
      },
    },
  },
} as const satisfies ODVRulesSchema
