/**
 * User input sanitization for security and normalization.
 * - Strip: no HTML (all tags removed so content is plain text).
 * - Normalize: trim, collapse whitespace, remove control characters.
 * - Disallow: reject obviously dangerous content and return an error.
 */

export type SanitizeOptions = {
  /** Max length after sanitization (default: no limit). */
  maxLength?: number
  /** If true, reject content that looks like HTML/script and return error (disallow). Default: true. */
  disallowDangerous?: boolean
  /** Allow newlines (false = collapse to space). Default: true for bio/description, false for single-line. */
  allowNewlines?: boolean
}

/** Patterns that indicate dangerous or disallowed content. */
const DANGEROUS_PATTERNS = [
  /<script\b/i,
  /<iframe\b/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /on\w+\s*=\s*["']/i,
  /<\s*\/?\s*script/i,
  /<\s*\/?\s*iframe/i,
  /<\s*\/?\s*object\b/i,
  /<\s*\/?\s*embed\b/i
]

/** Control characters and other invisible/problematic chars (strip). */
const CONTROL_AND_INVISIBLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B-\u200D\uFEFF]/g

/** Strip HTML tags: remove any <...> so only plain text remains. */
function stripHtml (value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

/** Normalize whitespace: trim and collapse runs to single space (or preserve newlines if allowed). */
function normalizeWhitespace (value: string, allowNewlines: boolean): string {
  let s = value.trim()
  if (allowNewlines) {
    s = s.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
  } else {
    s = s.replace(/\s+/g, ' ')
  }
  return s
}

/** Remove control and invisible characters. */
function stripControlChars (value: string): string {
  return value.replace(CONTROL_AND_INVISIBLE, '')
}

/**
 * Sanitize user text: strip HTML, normalize whitespace, remove control chars.
 * Returns the sanitized string (no HTML, normalized).
 */
export function sanitizeText (
  value: string,
  options: SanitizeOptions = {}
): string {
  const { maxLength, allowNewlines = false } = options
  let s = String(value ?? '')
  s = stripHtml(s)
  s = stripControlChars(s)
  s = normalizeWhitespace(s, allowNewlines)
  if (typeof maxLength === 'number' && maxLength > 0 && s.length > maxLength) {
    s = s.slice(0, maxLength)
  }
  return s
}

export type ValidateResult =
  | { ok: true; sanitized: string }
  | { ok: false; error: string }

/**
 * Validate and sanitize: optionally disallow dangerous content (show error),
 * then return sanitized string or error message.
 */
export function validateAndSanitize (
  value: string,
  options: SanitizeOptions & { fieldName?: string } = {}
): ValidateResult {
  const { disallowDangerous = true, fieldName = 'This field' } = options
  const raw = String(value ?? '').trim()
  if (!raw) {
    return { ok: true, sanitized: '' }
  }

  if (disallowDangerous) {
    const dangerous = DANGEROUS_PATTERNS.some((re) => re.test(raw))
    if (dangerous) {
      return {
        ok: false,
        error: `${fieldName} contains disallowed content. Please use plain text only.`
      }
    }
  }

  const sanitized = sanitizeText(raw, options)
  return { ok: true, sanitized }
}

/** Reasonable max lengths for common fields. */
export const MAX_LENGTH = {
  username: 100,
  bio: 500,
  groupName: 100,
  categoryName: 80,
  suggestionText: 500,
  featureRequest: 2000,
  report: 2000,
  friendCode: 20,
  voteDescription: 300
} as const
