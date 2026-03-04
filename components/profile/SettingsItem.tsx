import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type { ThemeColors } from '@/lib/theme-colors'

export type SettingsItemType = 'link' | 'toggle' | 'select' | 'info'

export type SettingsItem = {
  id: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  description?: string
  type: SettingsItemType
  value?: unknown
  onPress?: () => void
  onValueChange?: (value: boolean) => void
  destructive?: boolean
}

type SettingsItemProps = {
  item: SettingsItem
  accentColor?: string
  themeColors?: ThemeColors
}

export default function SettingsItemRow ({ item, accentColor = '#22c55e', themeColors }: SettingsItemProps) {
  const Icon = item.icon
  const c = themeColors

  const content = (
    <>
      <View style={[styles.iconWrap, item.destructive && styles.iconWrapDestructive]}>
        <Icon size={22} color={item.destructive ? '#dc2626' : accentColor} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, c && { color: c.text }, item.destructive && styles.titleDestructive]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={[styles.description, c && { color: c.textMuted }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
      </View>
      {item.type === 'toggle' && typeof item.value === 'boolean' && (
        <Switch
          value={item.value}
          onValueChange={item.onValueChange}
          trackColor={{ false: c?.border ?? '#e2e8f0', true: accentColor }}
          thumbColor={c?.primaryText ?? '#ffffff'}
        />
      )}
      {item.type === 'link' && <ChevronRight size={20} color={c?.textMuted ?? '#94a3b8'} />}
    </>
  )

  if (item.type === 'toggle' && item.onValueChange != null) {
    return (
      <View style={[styles.row, c && { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        {content}
      </View>
    )
  }

  if (item.onPress) {
  return (
    <TouchableOpacity
      style={[styles.row, c && { backgroundColor: c.card, borderColor: c.cardBorder }]}
      onPress={item.onPress}
      activeOpacity={0.7}
      disabled={item.type === 'info'}>
      {content}
    </TouchableOpacity>
  )
}

  return <View style={[styles.row, c && { backgroundColor: c.card, borderColor: c.cardBorder }]}>{content}</View>
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minHeight: 56
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  iconWrapDestructive: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)'
  },
  textWrap: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b'
  },
  titleDestructive: {
    color: '#dc2626'
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2
  }
})
