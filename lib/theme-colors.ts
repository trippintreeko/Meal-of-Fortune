import type { ResolvedTheme } from '@/contexts/ThemeContext'

export type ThemeColors = {
  background: string
  card: string
  cardBorder: string
  text: string
  textMuted: string
  border: string
  primary: string
  primaryText: string
  destructive: string
  secondary: string
  secondaryBg: string
  inputBg: string
  inputBorder: string
  placeholder: string
  tabBarBg: string
  tabBarBorder: string
  tabBarActive: string
  tabBarInactive: string
}

export const LIGHT_COLORS: ThemeColors = {
  background: '#f8fafc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#22c55e',
  primaryText: '#ffffff',
  destructive: '#ef4444',
  secondary: '#6366f1',
  secondaryBg: '#f5f3ff',
  inputBg: '#ffffff',
  inputBorder: '#e2e8f0',
  placeholder: '#94a3b8',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
  tabBarActive: '#22c55e',
  tabBarInactive: '#94a3b8'
}

export const DARK_COLORS: ThemeColors = {
  background: '#0f172a',
  card: '#1e293b',
  cardBorder: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  border: '#334155',
  primary: '#22c55e',
  primaryText: '#ffffff',
  destructive: '#ef4444',
  secondary: '#818cf8',
  secondaryBg: '#312e81',
  inputBg: '#1e293b',
  inputBorder: '#334155',
  placeholder: '#64748b',
  tabBarBg: '#0f172a',
  tabBarBorder: '#334155',
  tabBarActive: '#22c55e',
  tabBarInactive: '#94a3b8'
}

export function getThemeColors (resolvedTheme: ResolvedTheme): ThemeColors {
  return resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS
}
