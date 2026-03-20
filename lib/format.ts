/**
 * Format recipe/meal titles for display: first letter of significant words capitalized,
 * small words (and, the, or, with, of, etc.) lowercase.
 */

const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with'
])

/**
 * Returns a title-cased string: significant words capitalized, small words lowercase.
 * e.g. "CHICKEN AND RICE" -> "Chicken and Rice", "the best SOUP" -> "The Best Soup"
 */
export function formatRecipeTitle (value: string): string {
  const s = (value ?? '').trim()
  if (!s) return s
  const words = s.toLowerCase().split(/\s+/)
  return words
    .map((word, i) => {
      if (!word) return word
      const isFirst = i === 0
      const isLast = i === words.length - 1
      const isSmall = SMALL_WORDS.has(word)
      if (isSmall && !isFirst && !isLast) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}
