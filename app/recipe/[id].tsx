import { useEffect, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useThemeColors } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'

type GalleryMealRow = {
  id: string
  title: string
  description: string | null
}

export default function RecipeScreen () {
  const router = useRouter()
  const colors = useThemeColors()
  const params = useLocalSearchParams<{ id?: string }>()
  const id = (params.id ?? '').trim()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('Recipe')
  const [description, setDescription] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [steps, setSteps] = useState('')

  const headerTitle = useMemo(() => (title || 'Recipe'), [title])

  useEffect(() => {
    let cancelled = false
    if (!id) {
      setLoading(false)
      return
    }
    setLoading(true)
    void (async () => {
      try {
        const { data } = await supabase
          .from('gallery_meals')
          .select('id, title, description')
          .eq('id', id)
          .maybeSingle()
        if (cancelled) return
        const row = data as GalleryMealRow | null
        setTitle(row?.title ?? 'Recipe')
        setDescription(row?.description ?? '')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {headerTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Recipes will be stored per meal later. For now this page is the editor shell.
        </Text>

        <Text style={[styles.label, { color: colors.textMuted }]}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={loading ? 'Loading…' : 'Short description'}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          multiline
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Ingredients</Text>
        <TextInput
          value={ingredients}
          onChangeText={setIngredients}
          placeholder="One per line"
          placeholderTextColor={colors.placeholder}
          style={[styles.inputTall, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          multiline
        />

        <Text style={[styles.label, { color: colors.textMuted }]}>Steps</Text>
        <TextInput
          value={steps}
          onChangeText={setSteps}
          placeholder="Step-by-step instructions"
          placeholderTextColor={colors.placeholder}
          style={[styles.inputTall, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
          multiline
        />

        <View style={[styles.saveBtn, { backgroundColor: colors.cardBorder }]}>
          <Text style={[styles.saveText, { color: colors.textMuted }]}>Save (coming soon)</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  backButton: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 36 },
  content: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 13, marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 44, fontSize: 15 },
  inputTall: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 120, fontSize: 15, textAlignVertical: 'top' },
  saveBtn: { marginTop: 18, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700' }
})

