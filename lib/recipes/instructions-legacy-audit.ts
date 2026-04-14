/**
 * Legacy instruction parsing (pre–digit-safety fix). Used only by
 * `scripts/audit-recipe-instructions.ts` to list recipes whose displayed steps changed.
 * Do not import from app code.
 */

import { stripHtml, instructionsToSteps } from './instructions'

function removeStepNumberLegacy (s: string): string {
  return s.replace(/^\d+[.)]\s*/, '').trim() || s
}

function splitOnIntegerStepMarkersLegacy (text: string): string[] {
  const re = /\s+(?=(?<!\d)\d{1,2}[.)](?!\d)\s+)/
  return text.split(re).map((s) => removeStepNumberLegacy(s.trim())).filter(Boolean)
}

function htmlWithLogicalNewlines (html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|ol|ul|section|article)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
}

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

/** Same pipeline as `instructionsToSteps` but with legacy step/temp stripping. */
export function instructionsToStepsLegacyAudit (raw: string): string[] {
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
      const sub = splitOnIntegerStepMarkersLegacy(inner)
      if (sub.length > 1) fromListItems.push(...sub)
      else fromListItems.push(removeStepNumberLegacy(inner))
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
      const sub = splitOnIntegerStepMarkersLegacy(line)
      if (sub.length > 1) fromParagraphs.push(...sub)
      else if (line) fromParagraphs.push(removeStepNumberLegacy(line))
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
      const sub = splitOnIntegerStepMarkersLegacy(line)
      if (sub.length > 1) merged.push(...sub)
      else merged.push(removeStepNumberLegacy(line))
    }
    return merged
  }

  const text = stripHtml(html)
  if (!text) return []

  const byNumbered = splitOnIntegerStepMarkersLegacy(text)
  if (byNumbered.length > 1) return byNumbered

  const lines = text.split(/\n+/).map((s) => removeStepNumberLegacy(s.trim())).filter(Boolean)
  if (lines.length > 1) return lines

  if (lines.length === 1 && lines[0].length > 80) {
    const retry = splitOnIntegerStepMarkersLegacy(lines[0])
    if (retry.length > 1) return retry
  }

  return lines
}

export function stepsDifferFromLegacy (raw: string): boolean {
  const a = instructionsToStepsLegacyAudit(raw)
  const b = instructionsToSteps(raw)
  if (a.length !== b.length) return true
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return true
  }
  return false
}
