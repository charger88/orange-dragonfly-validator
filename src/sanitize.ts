import { ODValidatorSecurityException } from './exceptions'

/** Keys that must never be used as property names to prevent prototype pollution. */
const POISONED_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Returns `true` if the key is safe to use as an object property name. */
export function isSafeKey(key: string): boolean {
  return !POISONED_KEYS.has(key)
}

/** Throws when a poisoned key is encountered in user input or a schema. */
export function assertSafeKey(key: string, source: 'input' | 'schema', path = ''): void {
  if (isSafeKey(key)) return
  const resolvedPath = path ? `${path}.${key}` : key
  throw new ODValidatorSecurityException(source, key, resolvedPath)
}

/** Recursively scans objects/arrays and rejects poisoned keys anywhere in the structure. */
export function assertNoPoisonedKeys(
  value: unknown,
  source: 'input' | 'schema',
  path = '',
  seen = new WeakSet<object>(),
): void {
  if (value === null || typeof value !== 'object') return
  const target = value as Record<string, unknown>
  if (seen.has(target)) return
  seen.add(target)
  for (const key of Object.keys(target)) {
    assertSafeKey(key, source, path)
    const childPath = path ? `${path}.${key}` : key
    assertNoPoisonedKeys(target[key], source, childPath, seen)
  }
}
