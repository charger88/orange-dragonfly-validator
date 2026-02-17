import type { ODVRuleSchema, ODVRulesSchema, ODVPerTypeRuleSchema, ODVValueType } from './types'
import { ODVRules } from './rules'

/**
 * Fluent builder for a single validation rule ({@link ODVRuleSchema}).
 *
 * @example
 * ```ts
 * new ODVPropertyBuilder().required().string().min(1).max(100)
 * ```
 */
export class ODVPropertyBuilder {
  private _types: ODVValueType[] = []
  private _rule: ODVRuleSchema = {}

  // --- Type methods ---

  string(): this {
    this._types.push('string')
    return this
  }

  number(): this {
    this._types.push('number')
    return this
  }

  integer(): this {
    this._types.push('integer')
    return this
  }

  boolean(): this {
    this._types.push('boolean')
    return this
  }

  array(): this {
    this._types.push('array')
    return this
  }

  object(): this {
    this._types.push('object')
    return this
  }

  null(): this {
    this._types.push('null')
    return this
  }

  type(t: ODVValueType | ODVValueType[]): this {
    if (Array.isArray(t)) {
      this._types.push(...t)
    } else {
      this._types.push(t)
    }
    return this
  }

  // --- Constraint methods ---

  required(): this {
    this._rule.required = true
    return this
  }

  default(value: unknown): this {
    this._rule.default = value
    return this
  }

  min(n: number): this {
    this._rule.min = n
    return this
  }

  max(n: number): this {
    this._rule.max = n
    return this
  }

  in(values: readonly unknown[]): this {
    this._rule.in = values
    return this
  }

  inPublic(values: readonly unknown[] | boolean): this {
    this._rule['in:public'] = values
    return this
  }

  pattern(p: RegExp | string): this {
    this._rule.pattern = p
    return this
  }

  special(name: string): this {
    this._rule.special = name
    return this
  }

  transform(fn: (value: unknown) => unknown): this {
    this._rule.transform = fn
    return this
  }

  applyTransformed(): this {
    this._rule.apply_transformed = true
    return this
  }

  // --- Nested ---

  children(configure: (builder: ODVSchemaBuilder) => ODVSchemaBuilder): this {
    const childBuilder = new ODVSchemaBuilder()
    configure(childBuilder)
    this._rule.children = childBuilder.toSchema()
    return this
  }

  perType(typeName: string, configure: (builder: ODVPropertyBuilder) => ODVPropertyBuilder): this {
    if (!this._rule.per_type) {
      this._rule.per_type = {}
    }
    const propBuilder = new ODVPropertyBuilder()
    configure(propBuilder)
    this._rule.per_type[typeName] = propBuilder._buildPerType()
    return this
  }

  // --- Internal ---

  /** @internal Builds the final rule schema. */
  _build(): ODVRuleSchema {
    const rule = { ...this._rule }
    if (this._types.length === 1) {
      rule.type = this._types[0]
    } else if (this._types.length > 1) {
      rule.type = this._types
    }
    return rule
  }

  /** @internal Builds a per-type rule (no type/required/default/per_type). */
  _buildPerType(): ODVPerTypeRuleSchema {
    const built = this._build()
    delete built.type
    delete built.required
    delete built.default
    delete built.per_type
    return built
  }
}

/**
 * Fluent builder for a validation schema ({@link ODVRulesSchema}).
 *
 * @example
 * ```ts
 * const rules = new ODVSchemaBuilder()
 *   .property('name', p => p.required().string().min(1))
 *   .property('age', p => p.integer().min(0))
 *   .strict()
 *   .complete()
 * ```
 */
export class ODVSchemaBuilder {
  private _schema: ODVRulesSchema = {}
  
  /** Creates a new {@link ODVSchemaBuilder} for fluent schema construction. */
  static create(): ODVSchemaBuilder {
    return new ODVSchemaBuilder()
  }

  /** Add a named property rule. */
  property(name: string, configure: (builder: ODVPropertyBuilder) => ODVPropertyBuilder): this {
    const propBuilder = new ODVPropertyBuilder()
    configure(propBuilder)
    this._schema[name] = propBuilder._build()
    return this
  }

  /** Set the wildcard (`*`) rule applied to every value. */
  wildcard(configure: (builder: ODVPropertyBuilder) => ODVPropertyBuilder): this {
    const propBuilder = new ODVPropertyBuilder()
    configure(propBuilder)
    this._schema['*'] = propBuilder._build()
    return this
  }

  /** Set the key name validator (`#`) rule. */
  keyValidator(configure: (builder: ODVPropertyBuilder) => ODVPropertyBuilder): this {
    const propBuilder = new ODVPropertyBuilder()
    configure(propBuilder)
    this._schema['#'] = propBuilder._build()
    return this
  }

  /** Set strict mode. When `true` (default), rejects undeclared keys. */
  strict(value = true): this {
    this._schema['@'] = { strict: value }
    return this
  }

  /** Return the built schema as a plain object. */
  toSchema(): ODVRulesSchema {
    return this._schema
  }

  /** Build and return an {@link ODVRules} instance. */
  complete(): ODVRules {
    return new ODVRules(this._schema)
  }
}
