/** Keys that must never be used as property names to prevent prototype pollution. */
const POISONED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Returns `true` if the key is safe to use as an object property name. */
export function isSafeKey(key: string): boolean {
  return !POISONED_KEYS.has(key)
}
