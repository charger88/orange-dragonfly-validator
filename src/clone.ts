import type { ODVRuleSchema, ODVPerTypeRuleSchema, ODVRulesSchema } from './types'

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

export function deepClonePerTypeRuleDef(def: ODVPerTypeRuleSchema): ODVPerTypeRuleSchema {
  const clone: ODVPerTypeRuleSchema = { ...def }
  if (def.in) clone.in = [...def.in]
  if (Array.isArray(def['in:public'])) {
    clone['in:public'] = [...def['in:public']]
  }
  if (def.pattern !== undefined) {
    clone.pattern = clonePattern(def.pattern)
  }
  if (def.children) {
    clone.children = deepCloneSchema(def.children)
  }
  return clone
}

export function deepCloneRuleDef(def: ODVRuleSchema): ODVRuleSchema {
  const clone: ODVRuleSchema = { ...def }
  if (Array.isArray(def.type)) {
    clone.type = [...def.type]
  }
  if (def.in) clone.in = [...def.in]
  if (Array.isArray(def['in:public'])) {
    clone['in:public'] = [...def['in:public']]
  }
  if (def.pattern !== undefined) {
    clone.pattern = clonePattern(def.pattern)
  }
  if (def.per_type) {
    clone.per_type = {}
    for (const key of Object.keys(def.per_type)) {
      clone.per_type[key] = deepClonePerTypeRuleDef(def.per_type[key])
    }
  }
  if (def.children) {
    clone.children = deepCloneSchema(def.children)
  }
  return clone
}

export function deepCloneSchema(schema: ODVRulesSchema): ODVRulesSchema {
  const clone: ODVRulesSchema = {}
  for (const key of Object.keys(schema)) {
    if (key === '@') {
      clone['@'] = { ...schema['@'] }
    } else {
      clone[key] = deepCloneRuleDef(schema[key] as ODVRuleSchema)
    }
  }
  return clone
}
