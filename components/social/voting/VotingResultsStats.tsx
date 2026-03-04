'use client'

import { View, Text, StyleSheet } from 'react-native'
import { Trophy, Users } from 'lucide-react-native'
import type { ThemeColors } from '@/lib/theme-colors'
import { LIGHT_COLORS } from '@/lib/theme-colors'

export type SuggestionStat = {
  suggestion_id: string
  suggestion_text: string
  vote_count: number
  percentage: number
  suggested_by_user_id: string | null
  suggested_by_username: string | null
}

type VotingResultsStatsProps = {
  totalParticipants: number
  totalVotes: number
  suggestions: SuggestionStat[]
  winnerSuggestionId: string | null
  themeColors?: ThemeColors
}

export default function VotingResultsStats ({
  totalParticipants,
  totalVotes,
  suggestions,
  winnerSuggestionId,
  themeColors = LIGHT_COLORS
}: VotingResultsStatsProps) {
  const c = themeColors
  const maxVotes = Math.max(1, ...suggestions.map(s => s.vote_count))

  return (
    <View style={[styles.wrapper, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Users size={20} color={c.textMuted} />
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</Text>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { color: c.text }]}>Results</Text>
      {suggestions.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>No suggestions in this vote.</Text>
      ) : (
        suggestions.map((s) => {
          const isWinner = s.suggestion_id === winnerSuggestionId
          const barWidth = maxVotes > 0 ? (s.vote_count / maxVotes) * 100 : 0
          return (
            <View
              key={s.suggestion_id}
              style={[
                styles.row,
                isWinner && [styles.rowWinner, { backgroundColor: c.secondaryBg }]
              ]}
            >
              <View style={styles.rowHeader}>
                {isWinner ? <Trophy size={16} color="#eab308" /> : null}
                <Text style={[styles.suggestionText, { color: c.text }, isWinner && styles.suggestionTextWinner]} numberOfLines={2}>
                  {s.suggestion_text}
                </Text>
              </View>
              <View style={[styles.barBg, { backgroundColor: c.cardBorder }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: c.primary },
                    isWinner && { backgroundColor: '#eab308' },
                    { width: `${barWidth}%` }
                  ]}
                />
              </View>
              <View style={styles.meta}>
                <Text style={[styles.voteCount, { color: c.textMuted }]}>{s.vote_count} vote{s.vote_count !== 1 ? 's' : ''}</Text>
                <Text style={[styles.percentage, { color: c.text }]}>{s.percentage}%</Text>
                {s.suggested_by_username ? (
                  <Text style={[styles.suggester, { color: c.textMuted }]}>by {s.suggested_by_username}</Text>
                ) : null}
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1
  },
  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  empty: { fontSize: 14 },
  row: { marginBottom: 14 },
  rowWinner: { marginHorizontal: -12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 14 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  suggestionText: { flex: 1, fontSize: 15, fontWeight: '500' },
  suggestionTextWinner: { fontWeight: '700' },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 3 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  voteCount: { fontSize: 12 },
  percentage: { fontSize: 12, fontWeight: '600' },
  suggester: { fontSize: 12 }
})
