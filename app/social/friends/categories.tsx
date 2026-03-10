'use client'

import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Alert } from 'react-native'
import { useSocialAuth } from '@/hooks/useSocialAuth'
import { supabase } from '@/lib/supabase'
import type { FriendCategory } from '@/types/social'
import { validateAndSanitize, MAX_LENGTH } from '@/lib/sanitize-input'

const DEFAULT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

export default function FriendCategoriesScreen () {
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
    <View style={styles.container}>
      <Text style={styles.hint}>Create labels like "Family" or "Work" and assign them to friends from their profile.</Text>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No categories yet. Tap "Add category" to create one.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />
              <Text style={styles.name}>{item.name}</Text>
              <TouchableOpacity onPress={() => deleteCategory(item)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>Add category</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New category</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              placeholderTextColor="#94a3b8"
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.colorRow}>
              {DEFAULT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorOption, { backgroundColor: c }, newColor === c && styles.colorOptionSelected]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, saving && styles.modalSaveDisabled]}
                onPress={createCategory}
                disabled={saving || !newName.trim()}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: { fontSize: 14, color: '#64748b', paddingHorizontal: 20, paddingVertical: 12 },
  list: { padding: 20, paddingBottom: 80 },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 15, marginTop: 24 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  colorBar: { width: 4, height: 36, borderRadius: 2, marginRight: 12 },
  name: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1e293b' },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 14, color: '#dc2626', fontWeight: '500' },
  addBtn: { position: 'absolute', bottom: 24, left: 20, right: 20, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16 },
  colorRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  colorOptionSelected: { borderColor: '#1e293b' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#f1f5f9' },
  modalCancelText: { color: '#64748b', fontWeight: '600' },
  modalSave: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#22c55e' },
  modalSaveDisabled: { opacity: 0.7 },
  modalSaveText: { color: '#fff', fontWeight: '600' }
})
