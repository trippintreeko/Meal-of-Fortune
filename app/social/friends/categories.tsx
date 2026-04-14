'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import type { FriendCategory } from '@/types/social'
import { validateAndSanitize, MAX_LENGTH } from '@/lib/sanitize-input'

const DEFAULT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

export default function FriendCategoriesScreen () {
  const colors = useThemeColors()
  const { profile, isAuthenticated, loading: authLoading } = useSocialAuth()
  const [categories, setCategories] = useState<Array<FriendCategory & { id: string; created_at?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0])
  const [saving, setSaving] = useState(false)

  const loadCategories = useCallback(async () => {
    if (!profile?.id || !isAuthenticated) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('friend_categories')
      .select('id, name, color, created_at')
      .eq('user_id', profile.id)
      .order('name')
    if (error) {
      setCategories([])
      setLoading(false)
      return
    }
    setCategories((data ?? []) as Array<FriendCategory & { id: string; created_at?: string }>)
    setLoading(false)
  }, [profile?.id, isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) return
    void loadCategories()
  }, [authLoading, isAuthenticated, loadCategories])

  const createCategory = async () => {
    const result = validateAndSanitize(newName, {
      fieldName: 'Category name',
      maxLength: MAX_LENGTH.categoryName,
      allowNewlines: false,
      disallowDangerous: true
    })
    if (!result.ok) {
      Alert.alert('Invalid', result.error)
      return
    }
    if (!result.sanitized || !profile?.id) return
    setSaving(true)
    const { error } = await supabase.from('friend_categories').insert({ user_id: profile.id, name: result.sanitized, color: newColor })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
      return
    }
    setNewName('')
    setNewColor(DEFAULT_COLORS[0])
    setModalVisible(false)
    void loadCategories()
  }

  const deleteCategory = (cat: FriendCategory & { id: string }) => {
    Alert.alert('Delete category', `Remove "${cat.name}"? Friends will be unassigned from this category.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('friend_categories').delete().eq('id', cat.id).eq('user_id', profile?.id)
          void loadCategories()
        }
      }
    ])
  }

  if (authLoading || !isAuthenticated) return null

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.hint, { color: colors.textMuted }]}>Create labels like "Family" or "Work" and assign them to friends from their profile.</Text>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>No categories yet. Tap "Add category" to create one.</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <TouchableOpacity onPress={() => deleteCategory(item)} style={styles.deleteBtn}>
                <Text style={[styles.deleteText, { color: colors.destructive }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => setModalVisible(true)}>
        <Text style={[styles.addBtnText, { color: colors.primaryText }]}>Add category</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New category</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text
                }
              ]}
              placeholder="Category name"
              placeholderTextColor={colors.placeholder}
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.colorRow}>
              {DEFAULT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    newColor === c && { borderColor: colors.text }
                  ]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { backgroundColor: colors.secondaryBg }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: colors.primary }, saving && styles.modalSaveDisabled]}
                onPress={createCategory}
                disabled={saving || !newName.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={[styles.modalSaveText, { color: colors.primaryText }]}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 14, paddingHorizontal: 20, paddingVertical: 12 },
  list: { padding: 20, paddingBottom: 80 },
  empty: { textAlign: 'center', fontSize: 15, marginTop: 24 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  colorBar: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  name: { flex: 1, fontSize: 17, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 14, fontWeight: '500' },
  addBtn: { position: 'absolute', bottom: 24, left: 20, right: 20, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  modalCancelText: { fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  modalSaveDisabled: { opacity: 0.7 },
  modalSaveText: { fontWeight: '600' }
})
