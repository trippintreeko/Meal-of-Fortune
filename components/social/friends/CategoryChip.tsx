'use client'

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import type { FriendCategory } from '@/types/social'

type CategoryChipProps = {
  category: FriendCategory
  onRemove?: () => void
  selected?: boolean
}

export function CategoryChip ({ category, onRemove, selected }: CategoryChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: category.color + '20', borderColor: category.color }, selected && styles.chipSelected]}>
      <View style={[styles.dot, { backgroundColor: category.color }]} />
      <Text style={[styles.label, { color: category.color }]} numberOfLines={1}>
        {category.name}
      </Text>
      {onRemove ? (
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={onRemove} style={styles.remove}>
          <Text style={[styles.removeText, { color: category.color }]}>×</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
    paddingRight: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
    maxWidth: 140
  },
  chipSelected: {
    borderWidth: 2,
    opacity: 1
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  label: {
    fontSize: 12,
    fontWeight: '500'
  },
  remove: {
    marginLeft: 2,
    padding: 2
  },
  removeText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18
  }
})
