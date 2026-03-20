/**
 * Parse Spoonacular recipe instructions (HTML or plain text) into displayable steps.
 * Used by food gallery modal and recipe page.
 */

/** Strip HTML tags and normalize whitespace. */
export function stripHtml (html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove leading step number (e.g. "1. " or "2) "). */
export function removeStepNumber (s: string): string {
  return s.replace(/^\d+[.)]\s*/, '').trim() || s
}

/**
 * Split instructions into steps.
 * Handles: (1) <ol><li>...</li></ol>, (2) <p>...</p> per step, (3) "1. ... 2. ..." in one block, (4) newlines.
 */
export function instructionsToSteps (raw: string): string[] {
  if (!raw || !raw.trim()) return []
  const html = raw.trim()

  const fromListItems: string[] = []
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match = liRegex.exec(html)
  while (match) {
    const inner = stripHtml(match[1])
    if (inner) fromListItems.push(removeStepNumber(inner))
    match = liRegex.exec(html)
  }
  if (fromListItems.length > 0) return fromListItems

  const fromParagraphs: string[] = []
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  match = pRegex.exec(html)
  while (match) {
    const inner = stripHtml(match[1])
    if (inner) fromParagraphs.push(removeStepNumber(inner))
    match = pRegex.exec(html)
  }
  if (fromParagraphs.length > 0) return fromParagraphs

  const text = stripHtml(html)
  if (!text) return []
  const byNumbered = text.split(/\s*\d+[.)]\s*/).map((s) => s.trim()).filter(Boolean)
  if (byNumbered.length > 1) return byNumbered
  const lines = text.split(/\n+/).map((s) => removeStepNumber(s.trim())).filter(Boolean)
  return lines
}
