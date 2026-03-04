import { getThemeColors } from '@/lib/theme-colors'
import type { ThemeColors } from '@/lib/theme-colors'
import { useTheme } from '@/contexts/ThemeContext'

export { useTheme, type ThemeMode, type ResolvedTheme } from '@/contexts/ThemeContext'
export type { ThemeColors } from '@/lib/theme-colors'

export function useThemeColors (): ThemeColors {
  const { resolvedTheme } = useTheme()
  return getThemeColors(resolvedTheme)
}
