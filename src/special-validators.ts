/**
 * RFC 5321-compliant email pattern. Rejects consecutive dots, leading dots, and
 * trailing dots in the local part. For edge cases like quoted local parts,
 * use a dedicated email validation library.
 */
export const EMAIL_PATTERN = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

/** International phone number pattern (E.164 format): `+` followed by 7–15 digits. */
export const PHONE_PATTERN = /^\+[1-9]\d{6,14}$/

/** US phone number pattern: `+1` followed by exactly 10 digits. */
export const US_PHONE_PATTERN = /^\+1[2-9]\d{2}[2-9]\d{6}$/

/** HTTP/HTTPS URL pattern with domain, optional port, path, query, and fragment. */
export const URL_PATTERN = /^https?:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*(?::\d{1,5})?(?:\/[^\s]*)?$/

/** UUID pattern matching versions 1–5 and NIL (case-insensitive). */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** IPv4 address pattern (four octets 0–255). */
export const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

/** ISO 8601 date pattern: `YYYY-MM-DD` with basic range validation for month (01–12) and day (01–31). */
export const DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/

/** ISO 8601 datetime pattern: `YYYY-MM-DDTHH:mm:ss` with optional fractional seconds and timezone (`Z` or `+HH:MM`/`-HH:MM`). */
export const DATETIME_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/

/** Hex color pattern: `#RGB`, `#RRGGBB`, or `#RRGGBBAA` (case-insensitive). */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** Map of built-in `special` validator names to their RegExp patterns. */
export const SPECIAL_VALIDATORS: Record<string, RegExp> = {
  email: EMAIL_PATTERN,
  phone: PHONE_PATTERN,
  'us-phone': US_PHONE_PATTERN,
  url: URL_PATTERN,
  uuid: UUID_PATTERN,
  ipv4: IPV4_PATTERN,
  date: DATE_PATTERN,
  datetime: DATETIME_PATTERN,
  'hex-color': HEX_COLOR_PATTERN,
}

/**
 * Maximum input lengths enforced before applying special validator regexes.
 * Prevents excessive backtracking on adversarial inputs.
 */
export const SPECIAL_MAX_LENGTHS: Record<string, number> = {
  email: 4096,
  phone: 16,
  'us-phone': 12,
  url: 8192,
  uuid: 36,
  ipv4: 15,
  date: 10,
  datetime: 35,
  'hex-color': 9,
}
