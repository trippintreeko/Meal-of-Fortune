'use client'

import { useMemo, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BadgeQuestionMark } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import type { HelpfulHintsMode } from '@/hooks/useHelpfulHints'
import { useHelpfulHints } from '@/hooks/useHelpfulHints'

type HelpfulHintProps = {
  text: string
  mode?: HelpfulHintsMode
  textStyle?: any
  iconStyle?: any
}

export function HelpfulHint ({ text, mode, textStyle, iconStyle }: HelpfulHintProps) {
  const colors = useThemeColors()
  const { mode: storeMode, isHydrated } = useHelpfulHints()
  const effectiveMode = mode ?? storeMode

  const [open, setOpen] = useState(false)

  const iconColor = useMemo(() => colors.primary, [colors.primary])
  const canShow = effectiveMode !== 'off' && text.trim().length > 0

  if (!isHydrated) return null
  if (!canShow) return null

  const toggle = () => { setOpen(v => !v) }

  return (
    <View style={styles.iconDrawerCol}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Helpful hint"
        onPress={toggle}
        style={[styles.iconTouch, iconStyle]}
      >
        <View style={[styles.iconBubble, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' }]}>
          <BadgeQuestionMark size={16} color={iconColor} />
        </View>
      </TouchableOpacity>

      {open ? <Text style={[styles.drawerText, textStyle]}>{text}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  iconDrawerCol: { flexDirection: 'column', alignItems: 'flex-start' },
  iconTouch: { alignSelf: 'flex-start', padding: 4, borderRadius: 999 },
  iconBubble: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  drawerText: { fontSize: 14, lineHeight: 20, color: '#64748b', marginTop: 6 }
})

