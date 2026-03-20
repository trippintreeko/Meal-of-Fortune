import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { ThumbsUp, Trash2 } from 'lucide-react-native'
import { Swipeable } from 'react-native-gesture-handler'
import type { ThemeColors } from '@/lib/theme-colors'
import type { MealSuggestionWithMeta } from '@/types/social'
import { LIGHT_COLORS } from '@/lib/theme-colors'
import { getDisplayUsername } from '@/lib/username-display'

type SuggestionListProps = {
  suggestions: MealSuggestionWithMeta[]
  currentUserId: string | null
  onVote: (suggestionId: string) => void
  /** When true, admin can swipe to reveal a delete action for each suggestion */
  isAdmin?: boolean
  onRemoveSuggestion?: (suggestionId: string) => void
  themeColors?: ThemeColors
}

function DeleteActionButton ({ onRemove }: { onRemove: () => void }) {
  return (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={onRemove}
      activeOpacity={0.8}
    >
      <Trash2 size={24} color="#fff" />
      <Text style={styles.deleteActionText}>Remove</Text>
    </TouchableOpacity>
  )
}

export default function SuggestionList ({
  suggestions,
  currentUserId,
  onVote,
  isAdmin = false,
  onRemoveSuggestion,
  themeColors = LIGHT_COLORS
}: SuggestionListProps) {
  const c = themeColors
  return (
    <View style={styles.container}>
      {suggestions.map((s) => {
        const userVoted = s.user_voted ?? false
        const card = (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.suggestion, { color: c.text }]}>{s.suggestion}</Text>
            {(s.category || s.price_range) && (
              <Text style={[styles.meta, { color: c.textMuted }]}>
                {[s.category, s.price_range].filter(Boolean).join(' · ')}
              </Text>
            )}
            {s.username ? <Text style={[styles.by, { color: c.textMuted }]}>By {getDisplayUsername(s.username)}</Text> : null}
            <View style={styles.row}>
              <Text style={[styles.votes, { color: c.textMuted }]}>{s.vote_count} vote{s.vote_count !== 1 ? 's' : ''}</Text>
              <TouchableOpacity
                style={[
                  styles.voteBtn,
                  { borderColor: c.primary },
                  userVoted && [styles.voteBtnActive, { backgroundColor: c.primary, borderColor: c.primary }]
                ]}
                onPress={() => onVote(s.id)}
                disabled={userVoted}
              >
                <ThumbsUp size={18} color={userVoted ? '#fff' : c.primary} />
                <Text style={[styles.voteBtnText, { color: c.primary }, userVoted && styles.voteBtnTextActive]}>
                  {userVoted ? 'Voted' : 'Vote'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )

        if (isAdmin && onRemoveSuggestion) {
          return (
            <Swipeable
              key={s.id}
              renderRightActions={() => (
                <DeleteActionButton onRemove={() => onRemoveSuggestion(s.id)} />
              )}
              friction={2}
              rightThreshold={40}
            >
              {card}
            </Swipeable>
          )
        }

        return <View key={s.id}>{card}</View>
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  suggestion: { fontSize: 17, fontWeight: '600', color: '#1e293b' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  by: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  votes: { fontSize: 14, color: '#475569' },
  voteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#22c55e' },
  voteBtnActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  voteBtnText: { fontSize: 14, fontWeight: '600', color: '#22c55e' },
  voteBtnTextActive: { color: '#fff' },
  deleteAction: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 12
  },
  deleteActionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 }
})
