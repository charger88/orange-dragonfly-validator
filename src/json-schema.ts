import type { ODVRulesSchema, ODVRuleSchema, ODVPerTypeRuleSchema } from './types'

/** Subset of JSON Schema (draft-07 / 2020-12) supported by the converter. */
export interface JsonSchema {
  type?: string | string[]
  properties?: Record<string, JsonSchema>
  required?: string[]
  items?: JsonSchema
  enum?: unknown[]
  const?: unknown
  default?: unknown
  minimum?: number
  maximum?: number
  exclusiveMinimum?: number
  exclusiveMaximum?: number
  minLength?: number
  maxLength?: number
  minItems?: number
  maxItems?: number
  pattern?: string
  format?: string
  additionalProperties?: boolean | JsonSchema
  propertyNames?: JsonSchema
  [key: string]: unknown
}

/** Result of {@link fromJsonSchema}: the converted ODV schema and any conversion warnings. */
export interface FromJsonSchemaResult {
  schema: ODVRulesSchema
  warnings: string[]
}

const FORMAT_TO_SPECIAL: Record<string, string> = {
  email: 'email',
  uri: 'url',
  url: 'url',
  uuid: 'uuid',
  phone: 'phone',
  'us-phone': 'us-phone',
  ipv4: 'ipv4',
  date: 'date',
  'date-time': 'datetime',
  'hex-color': 'hex-color',
}

const SPECIAL_TO_FORMAT: Record<string, string> = {
  email: 'email',
  url: 'uri',
  uuid: 'uuid',
  phone: 'phone',
  'us-phone': 'us-phone',
  ipv4: 'ipv4',
  date: 'date',
  datetime: 'date-time',
  'hex-color': 'hex-color',
}

const VALID_ODV_TYPES = new Set(['string', 'number', 'integer', 'array', 'object', 'boolean', 'null'])

const SUPPORTED_KEYWORDS = new Set([
  'type', 'properties', 'required', 'items', 'enum', 'const', 'default',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum',
  'minLength', 'maxLength', 'minItems', 'maxItems',
  'pattern', 'format', 'additionalProperties', 'propertyNames',
])

const SKIPPABLE_KEYWORDS = new Set([
  '$schema', '$id', '$comment', '$defs', 'definitions',
  'title', 'description', 'examples', 'readOnly', 'writeOnly',
])

// ─── fromJsonSchema ──────────────────────────────────────────────────

function convertType(jsType: string | string[] | undefined): string[] | undefined {
  if (jsType === undefined) return undefined
  const types = Array.isArray(jsType) ? jsType : [jsType]
  return types.filter(t => VALID_ODV_TYPES.has(t))
}

function resolveMinMaxForType(js: JsonSchema, type: string, warnings: string[], path: string): { min?: number, max?: number } {
  const result: { min?: number, max?: number } = {}
  if (type === 'string') {
    if (js.minLength !== undefined) result.min = js.minLength
    if (js.maxLength !== undefined) result.max = js.maxLength
  } else if (type === 'number' || type === 'integer') {
    if (js.minimum !== undefined) result.min = js.minimum
    else if (js.exclusiveMinimum !== undefined) {
      if (type === 'integer') {
        result.min = Math.floor(js.exclusiveMinimum) + 1
      } else {
        warnings.push(`'exclusiveMinimum' at ${path || 'root'} converted to 'minimum' (ODV has no exclusive bounds)`)
        result.min = js.exclusiveMinimum
      }
    }
    if (js.maximum !== undefined) result.max = js.maximum
    else if (js.exclusiveMaximum !== undefined) {
      if (type === 'integer') {
        result.max = Math.ceil(js.exclusiveMaximum) - 1
      } else {
        warnings.push(`'exclusiveMaximum' at ${path || 'root'} converted to 'maximum' (ODV has no exclusive bounds)`)
        result.max = js.exclusiveMaximum
      }
    }
  } else if (type === 'array') {
    if (js.minItems !== undefined) result.min = js.minItems
    if (js.maxItems !== undefined) result.max = js.maxItems
  }
  return result
}

function collectWarnings(js: JsonSchema, path: string, warnings: string[]): void {
  for (const key of Object.keys(js)) {
    if (!SUPPORTED_KEYWORDS.has(key) && !SKIPPABLE_KEYWORDS.has(key)) {
      warnings.push(`Unsupported keyword '${key}' at ${path || 'root'}`)
    }
  }
}

function convertPropertyToRule(js: JsonSchema, path: string, warnings: string[]): ODVRuleSchema {
  collectWarnings(js, path, warnings)

  const rule: ODVRuleSchema = {}
  const types = convertType(js.type)
  if (types !== undefined && types.length > 0) {
    rule.type = types.length === 1 ? types[0] as ODVRuleSchema['type'] : types as unknown as ODVRuleSchema['type']
  }

  if (js.const !== undefined) {
    rule.in = [js.const]
  } else if (js.enum !== undefined) {
    rule.in = js.enum
  }
  if (js.default !== undefined) {
    rule.default = js.default
  }
  if (js.pattern !== undefined) {
    rule.pattern = js.pattern
  }
  if (js.format !== undefined) {
    const special = FORMAT_TO_SPECIAL[js.format]
    if (special) {
      rule.special = special
    } else {
      warnings.push(`Unsupported format '${js.format}' at ${path || 'root'}`)
    }
  }

  // min/max: if single type or no type, assign directly; if multi-type, use per_type
  const hasMinMax = js.minimum !== undefined || js.maximum !== undefined ||
    js.exclusiveMinimum !== undefined || js.exclusiveMaximum !== undefined ||
    js.minLength !== undefined || js.maxLength !== undefined ||
    js.minItems !== undefined || js.maxItems !== undefined

  if (hasMinMax) {
    if (types !== undefined && types.length > 1) {
      // Multi-type: distribute min/max into per_type
      const perType: Record<string, ODVPerTypeRuleSchema> = {}
      for (const t of types) {
        const mm = resolveMinMaxForType(js, t, warnings, path)
        if (mm.min !== undefined || mm.max !== undefined) {
          perType[t] = {}
          if (mm.min !== undefined) perType[t].min = mm.min
          if (mm.max !== undefined) perType[t].max = mm.max
        }
      }
      if (Object.keys(perType).length > 0) {
        rule.per_type = { ...rule.per_type, ...perType }
      }
    } else {
      // Single type or no type: assign directly
      const singleType = types?.[0]
      if (singleType) {
        const mm = resolveMinMaxForType(js, singleType, warnings, path)
        if (mm.min !== undefined) rule.min = mm.min
        if (mm.max !== undefined) rule.max = mm.max
      } else {
        // No type specified — try all numeric keywords
        if (js.minimum !== undefined) rule.min = js.minimum
        else if (js.exclusiveMinimum !== undefined) rule.min = js.exclusiveMinimum
        else if (js.minLength !== undefined) rule.min = js.minLength
        else if (js.minItems !== undefined) rule.min = js.minItems
        if (js.maximum !== undefined) rule.max = js.maximum
        else if (js.exclusiveMaximum !== undefined) rule.max = js.exclusiveMaximum
        else if (js.maxLength !== undefined) rule.max = js.maxLength
        else if (js.maxItems !== undefined) rule.max = js.maxItems
      }
    }
  }

  // children: properties (object) or items (array)
  if (js.properties !== undefined) {
    const childSchema = convertObjectToSchema(js, path, warnings)
    rule.children = childSchema
  } else if (js.items !== undefined) {
    const itemRule = convertPropertyToRule(js.items, `${path}.*`, warnings)
    rule.children = { '*': itemRule }
  }

  return rule
}

function convertObjectToSchema(js: JsonSchema, path: string, warnings: string[]): ODVRulesSchema {
  const schema: ODVRulesSchema = {}

  const requiredSet = new Set(js.required ?? [])

  if (js.additionalProperties === false) {
    schema['@'] = { strict: true }
  } else if (typeof js.additionalProperties === 'object') {
    // JSON Schema allows a schema for additional properties; ODV only supports boolean strict mode.
    // Treat as strict: false (additional properties are allowed) and warn.
    schema['@'] = { strict: false }
    warnings.push(`'additionalProperties' schema at ${path || 'root'} converted to non-strict mode (ODV only supports boolean)`)
  } else {
    schema['@'] = { strict: false }
  }

  if (js.propertyNames !== undefined) {
    const keyRule: ODVRuleSchema = { type: 'string' }
    if (js.propertyNames.pattern !== undefined) {
      keyRule.pattern = js.propertyNames.pattern
    }
    if (js.propertyNames.minLength !== undefined) {
      keyRule.min = js.propertyNames.minLength
    }
    if (js.propertyNames.maxLength !== undefined) {
      keyRule.max = js.propertyNames.maxLength
    }
    if (js.propertyNames.enum !== undefined) {
      keyRule.in = js.propertyNames.enum
    } else if (js.propertyNames.const !== undefined) {
      keyRule.in = [js.propertyNames.const]
    }
    if (js.propertyNames.format !== undefined) {
      const special = FORMAT_TO_SPECIAL[js.propertyNames.format]
      if (special) keyRule.special = special
    }
    schema['#'] = keyRule
  }

  if (js.properties !== undefined) {
    for (const key of Object.keys(js.properties)) {
      const propPath = path ? `${path}.${key}` : key
      const rule = convertPropertyToRule(js.properties[key], propPath, warnings)
      if (requiredSet.has(key)) {
        rule.required = true
      }
      schema[key] = rule
    }
  }

  return schema
}

/**
 * Converts a JSON Schema object to an ODV rules schema.
 * Unsupported keywords are skipped and reported as warnings.
 *
 * **Unsupported JSON Schema features** (no ODV equivalent):
 * - `oneOf`, `anyOf`, `allOf` — union/intersection schemas
 * - `not` — schema negation
 * - `if` / `then` / `else` — conditional validation
 * - `dependencies` / `dependentRequired` / `dependentSchemas` — cross-field dependencies
 * - `$ref` / `$dynamicRef` — schema references and composition
 * - `prefixItems` / `contains` — tuple and containment validation for arrays
 * - `patternProperties` — regex-keyed property schemas
 *
 * These keywords will be reported as unsupported in the returned `warnings` array.
 * For conditional or cross-field validation, use the `transform` function or
 * validate in multiple passes with different schemas.
 */
export function fromJsonSchema(jsonSchema: JsonSchema): FromJsonSchemaResult {
  const warnings: string[] = []
  collectWarnings(jsonSchema, '', warnings)
  const schema = convertObjectToSchema(jsonSchema, '', warnings)
  return { schema, warnings }
}

// ─── toJsonSchema ────────────────────────────────────────────────────

function ruleToJsonProperty(rule: ODVRuleSchema): JsonSchema {
  const js: JsonSchema = {}

  // type
  if (rule.type !== undefined && rule.type !== null) {
    const types = (Array.isArray(rule.type) ? [...rule.type] : [rule.type])
      .filter(t => t !== 'function')
      // Remove 'integer' if 'number' is present (JSON Schema number covers integer)
      .filter((t, _i, arr) => !(t === 'integer' && arr.includes('number')))
    if (types.length === 1) {
      js.type = types[0]
    } else if (types.length > 1) {
      js.type = types
    }
  }

  // const / enum
  if (rule.in !== undefined) {
    if (rule.in.length === 1) {
      js.const = rule.in[0]
    } else {
      js.enum = [...rule.in]
    }
  }

  // default
  if (rule.default !== undefined) {
    js.default = rule.default
  }

  // pattern
  if (rule.pattern !== undefined) {
    js.pattern = rule.pattern instanceof RegExp ? rule.pattern.source : rule.pattern
  }

  // special → format
  if (rule.special !== undefined) {
    const format = SPECIAL_TO_FORMAT[rule.special]
    if (format) {
      js.format = format
    }
  }

  // min/max — need to figure out which JSON Schema keyword based on type
  const resolvedTypes = rule.type !== undefined && rule.type !== null
    ? (Array.isArray(rule.type) ? rule.type : [rule.type])
    : []

  if (rule.min !== undefined || rule.max !== undefined) {
    if (resolvedTypes.length <= 1) {
      const singleType = resolvedTypes[0] as string | undefined
      applyMinMaxToJsonSchema(js, singleType, rule.min, rule.max)
    }
    // Multi-type with direct min/max: use the first applicable type
    else {
      applyMinMaxToJsonSchema(js, resolvedTypes[0] as string, rule.min, rule.max)
    }
  }

  // per_type → distribute min/max
  if (rule.per_type !== undefined) {
    for (const typeKey of Object.keys(rule.per_type)) {
      const perTypeRule = rule.per_type[typeKey]
      applyMinMaxToJsonSchema(js, typeKey, perTypeRule.min, perTypeRule.max)
    }
  }

  // children → properties or items
  if (rule.children !== undefined) {
    const isArray = resolvedTypes.includes('array')
    const isObject = resolvedTypes.includes('object')

    if (isArray && rule.children['*'] !== undefined) {
      js.items = ruleToJsonProperty(rule.children['*'] as ODVRuleSchema)
    }
    if (isObject || (!isArray && !isObject)) {
      Object.assign(js, schemaToJsonObject(rule.children))
    }
  }

  return js
}

function applyMinMaxToJsonSchema(js: JsonSchema, type: string | undefined, min: number | undefined, max: number | undefined): void {
  if (type === 'string') {
    if (min !== undefined) js.minLength = min
    if (max !== undefined) js.maxLength = max
  } else if (type === 'number' || type === 'integer') {
    if (min !== undefined) js.minimum = min
    if (max !== undefined) js.maximum = max
  } else if (type === 'array') {
    if (min !== undefined) js.minItems = min
    if (max !== undefined) js.maxItems = max
  } else {
    // Unknown or no type — default to numeric
    if (min !== undefined) js.minimum = min
    if (max !== undefined) js.maximum = max
  }
}

function schemaToJsonObject(schema: ODVRulesSchema): JsonSchema {
  const js: JsonSchema = {}
  const requiredFields: string[] = []
  const properties: Record<string, JsonSchema> = {}

  // '@' → additionalProperties
  if (schema['@'] !== undefined) {
    const opts = schema['@']
    if (opts.strict === true) {
      js.additionalProperties = false
    } else if (opts.strict === false) {
      js.additionalProperties = true
    }
  }

  // '#' → propertyNames
  if (schema['#'] !== undefined) {
    const keyRule = schema['#'] as ODVRuleSchema
    const propertyNames: JsonSchema = {}
    if (keyRule.pattern !== undefined) {
      propertyNames.pattern = keyRule.pattern instanceof RegExp ? keyRule.pattern.source : keyRule.pattern
    }
    if (keyRule.min !== undefined) propertyNames.minLength = keyRule.min
    if (keyRule.max !== undefined) propertyNames.maxLength = keyRule.max
    if (keyRule.in !== undefined) {
      if (keyRule.in.length === 1) {
        propertyNames.const = keyRule.in[0]
      } else {
        propertyNames.enum = [...keyRule.in]
      }
    }
    if (keyRule.special !== undefined) {
      const format = SPECIAL_TO_FORMAT[keyRule.special]
      if (format) propertyNames.format = format
    }
    js.propertyNames = propertyNames
  }

  for (const key of Object.keys(schema)) {
    if (key === '@' || key === '#' || key === '*') continue
    const rule = schema[key] as ODVRuleSchema
    if (rule.required) {
      requiredFields.push(key)
    }
    properties[key] = ruleToJsonProperty(rule)
  }

  if (Object.keys(properties).length > 0) {
    js.properties = properties
  }
  if (requiredFields.length > 0) {
    js.required = requiredFields
  }

  return js
}

/**
 * Converts an ODV rules schema to a JSON Schema object.
 * Features without a JSON Schema equivalent (e.g. `transform`) are silently skipped.
 */
export function toJsonSchema(schema: ODVRulesSchema): JsonSchema {
  const js: JsonSchema = {
    type: 'object',
    ...schemaToJsonObject(schema),
  }
  return js
}
