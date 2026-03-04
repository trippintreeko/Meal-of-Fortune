import { View, Text, StyleSheet } from 'react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import SettingsItemRow, { type SettingsItem } from './SettingsItem'

type SettingsListProps = {
  title?: string
  items: SettingsItem[]
  accentColor?: string
  themeColors?: ThemeColors
}

export default function SettingsList ({ title, items, accentColor = '#22c55e', themeColors }: SettingsListProps) {
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.sectionTitle, themeColors && { color: themeColors.textMuted }]}>{title}</Text> : null}
      {items.map((item) => (
        <SettingsItemRow key={item.id} item={item} accentColor={accentColor} themeColors={themeColors} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
})
