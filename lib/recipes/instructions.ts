/**
 * Parse Spoonacular recipe instructions (HTML, plain text, or analyzedInstructions JSON)
 * into displayable steps.
 */

/** Strip HTML tags and normalize whitespace (single-line). */
export function stripHtml (html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove leading step index (e.g. "1. " or "12) "), not oven temps like "350." or "420."
 * Uses 1–2 digit indices only and requires the period/paren not be followed by another digit
 * (so "420." stays; "42. Mix" still strips step 42).
 */
export function removeStepNumber (s: string): string {
  const next = s.replace(/^(?:[1-9]|[1-9]\d)(?!\d)[.)]\s*/, '').trim()
  return next || s.trim() || s
}

/** Turn block-level / line-break HTML into newlines before we extract tags or plain text. */
function htmlWithLogicalNewlines (html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|ol|ul|section|article)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
}

/**
 * If DB stored Spoonacular `analyzedInstructions` JSON (array of { steps: [{ step }] }),
 * return those step strings.
 */
function tryStepsFromAnalyzedJson (raw: string): string[] | null {
  const t = raw.trim()
  if (!t.startsWith('[') && !t.startsWith('{')) return null
  try {
    const parsed = JSON.parse(t) as unknown
    const blocks = Array.isArray(parsed) ? parsed : [parsed]
    const out: string[] = []
    for (const block of blocks) {
      if (block == null || typeof block !== 'object') continue
      const steps = (block as { steps?: unknown }).steps
      if (!Array.isArray(steps)) continue
      for (const s of steps) {
        if (s != null && typeof s === 'object' && typeof (s as { step?: unknown }).step === 'string') {
          const line = ((s as { step: string }).step || '').trim()
          if (line) out.push(line)
        }
      }
    }
    return out.length > 0 ? out : null
  } catch {
    return null
  }
}

/**
 * Split "1. First 2. Second" without breaking decimals (1.5) or 3+ digit temps ("420. ").
 * Step markers are 1–2 digits not part of a longer number: no split inside "420." etc.
 */
function splitOnIntegerStepMarkers (text: string): string[] {
  const re = /\s+(?=(?<!\d)(?:[1-9]|[1-9]\d)(?!\d)[.)](?!\d)\s+)/
  const parts = text.split(re).map((s) => removeStepNumber(s.trim())).filter(Boolean)
  return parts
}

/**
 * Split instructions into steps.
 * Handles: analyzedInstructions JSON, <ol><li>, <p> blocks, <br>-separated lines,
 * inline "1. ... 2. ...", and plain newlines.
 */
export function instructionsToSteps (raw: string): string[] {
  if (!raw || !raw.trim()) return []

  const jsonSteps = tryStepsFromAnalyzedJson(raw)
  if (jsonSteps) return jsonSteps

  const html = htmlWithLogicalNewlines(raw.trim())

  const fromListItems: string[] = []
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match = liRegex.exec(html)
  while (match) {
    const inner = stripHtml(match[1]).replace(/\n+/g, ' ').trim()
    if (inner) {
      const sub = splitOnIntegerStepMarkers(inner)
      if (sub.length > 1) fromListItems.push(...sub)
      else fromListItems.push(removeStepNumber(inner))
    }
    match = liRegex.exec(html)
  }
  if (fromListItems.length > 0) return fromListItems

  const fromParagraphs: string[] = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  match = pRegex.exec(html)
  while (match) {
    const inner = match[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .split(/\n+/)
      .map((line) => stripHtml(line).trim())
      .filter(Boolean)
    for (const line of inner) {
      const sub = splitOnIntegerStepMarkers(line)
      if (sub.length > 1) fromParagraphs.push(...sub)
      else if (line) fromParagraphs.push(removeStepNumber(line))
    }
    match = pRegex.exec(html)
  }
  if (fromParagraphs.length > 0) return fromParagraphs

  const plainMultiline = html
    .replace(/<[^>]+>/g, '\n')
    .split(/\n+/)
    .map((s) => stripHtml(s))
    .map((s) => s.trim())
    .filter(Boolean)

  if (plainMultiline.length > 1) {
    const merged: string[] = []
    for (const line of plainMultiline) {
      const sub = splitOnIntegerStepMarkers(line)
      if (sub.length > 1) merged.push(...sub)
      else merged.push(removeStepNumber(line))
    }
    return merged
  }

  const text = stripHtml(html)
  if (!text) return []

  const byNumbered = splitOnIntegerStepMarkers(text)
  if (byNumbered.length > 1) return byNumbered

  const lines = text.split(/\n+/).map((s) => removeStepNumber(s.trim())).filter(Boolean)
  if (lines.length > 1) return lines

  if (lines.length === 1 && lines[0].length > 80) {
    const retry = splitOnIntegerStepMarkers(lines[0])
    if (retry.length > 1) return retry
  }

  return lines
}
