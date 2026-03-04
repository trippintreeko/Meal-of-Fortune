'use client'

import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image } from 'react-native'
import { X } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { AVATAR_KEYS, getAvatarFoodAssetSourceByKey } from '@/lib/avatar-food-asset'
import type { FoodAssetKey } from '@/lib/food-asset-mapping'

const GRID_GAP = 12
const TILE_SIZE = 72

function keyToLabel (key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

type FoodAvatarPickerProps = {
  visible: boolean
  onClose: () => void
  onSelect: (key: FoodAssetKey) => void
  selectedKey?: string | null
}

export default function FoodAvatarPicker ({ visible, onClose, onSelect, selectedKey }: FoodAvatarPickerProps) {
  const colors = useThemeColors()

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={[styles.content, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Choose food avatar</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {AVATAR_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tile,
                  { backgroundColor: colors.secondaryBg },
                  selectedKey === key && { borderColor: colors.primary, borderWidth: 3 }
                ]}
                onPress={() => onSelect(key)}
                activeOpacity={0.8}
              >
                <Image
                  source={getAvatarFoodAssetSourceByKey(key)}
                  style={styles.tileImage}
                  resizeMode="cover"
                />
                <Text style={[styles.tileLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  {keyToLabel(key)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  content: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1
  },
  title: {
    fontSize: 18,
    fontWeight: '700'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: GRID_GAP,
    gap: GRID_GAP
  },
  tile: {
    width: TILE_SIZE + 24,
    height: TILE_SIZE + 28,
    borderRadius: 12,
    alignItems: 'center',
    padding: 6,
    overflow: 'hidden'
  },
  tileImage: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10
  },
  tileLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center'
  }
})
