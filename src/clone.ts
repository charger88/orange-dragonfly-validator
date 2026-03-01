import type { ODValidatorRuleSchema, ODValidatorPerTypeRuleSchema, ODValidatorRulesSchema } from './types'
import { isSafeKey } from './sanitize'

// Manual deep clone is required because structuredClone cannot handle
// function references (the `transform` property). Functions are inherently
// immutable so they are preserved by reference rather than cloned.
// RegExp objects are cloned because they carry mutable `.lastIndex` state.

function clonePattern(pattern: RegExp | string | undefined): RegExp | string | undefined {
  if (pattern instanceof RegExp) {
    return new RegExp(pattern.source, pattern.flags)
  }
  return pattern
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function cloneDefaultValue(value: unknown): unknown {
  try {
    return structuredClone(value)
  } catch {
    return value
  }
}

export function deepClonePerTypeRuleDef(def: ODValidatorPerTypeRuleSchema): ODValidatorPerTypeRuleSchema {
  const clone: ODValidatorPerTypeRuleSchema = { ...def }
  if (def.in) clone.in = [...def.in]
  if (Array.isArray(def['in:public'])) {
    clone['in:public'] = [...def['in:public']]
  }
  if (def.pattern !== undefined) {
    clone.pattern = clonePattern(def.pattern)
  }
  if (isPlainRecord(def.children)) {
    clone.children = deepCloneSchema(def.children)
  }
  return clone
}

export function deepCloneRuleDef(def: ODValidatorRuleSchema): ODValidatorRuleSchema {
  const clone: ODValidatorRuleSchema = { ...def }
  if (Array.isArray(def.type)) {
    clone.type = [...def.type]
  }
  if (def.default !== undefined) {
    clone.default = cloneDefaultValue(def.default)
  }
  if (def.in) clone.in = [...def.in]
  if (Array.isArray(def['in:public'])) {
    clone['in:public'] = [...def['in:public']]
  }
  if (def.pattern !== undefined) {
    clone.pattern = clonePattern(def.pattern)
  }
  if (isPlainRecord(def.per_type)) {
    clone.per_type = {}
    for (const key of Object.keys(def.per_type)) {
      if (!isSafeKey(key)) continue
      const perTypeRule = def.per_type[key]
      clone.per_type[key] = isPlainRecord(perTypeRule)
        ? deepClonePerTypeRuleDef(perTypeRule as ODValidatorPerTypeRuleSchema)
        : perTypeRule as unknown as ODValidatorPerTypeRuleSchema
    }
  }
  if (isPlainRecord(def.children)) {
    clone.children = deepCloneSchema(def.children)
  }
  return clone
}

export function deepCloneSchema(schema: ODValidatorRulesSchema): ODValidatorRulesSchema {
  const clone: ODValidatorRulesSchema = {}
  const source = schema as Record<string, unknown>
  for (const key of Object.keys(schema)) {
    if (key === '@') {
      const options = source['@']
      clone['@'] = isPlainRecord(options)
        ? { ...options }
        : options as ODValidatorRulesSchema['@']
    } else {
      if (!isSafeKey(key)) continue
      const rule = source[key]
      clone[key] = isPlainRecord(rule)
        ? deepCloneRuleDef(rule as ODValidatorRuleSchema)
        : rule as ODValidatorRuleSchema
    }
  }
  return clone
}
