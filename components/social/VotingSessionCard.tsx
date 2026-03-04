import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { Clock } from 'lucide-react-native'
import type { VotingSession } from '@/types/social'

type VotingSessionCardProps = {
  session: VotingSession
  groupName?: string
  onPress: () => void
}

function formatDeadline (iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

function formatCountdown (iso: string): string {
  try {
    const end = new Date(iso).getTime()
    const now = Date.now()
    const diff = end - now
    if (diff <= 0) return 'Ended'
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const min = m % 60
    if (h > 0) return `${h}h ${min}m left`
    return `${min}m left`
  } catch {
    return ''
  }
}

export default function VotingSessionCard ({ session, groupName, onPress }: VotingSessionCardProps) {
  const countdown = formatCountdown(session.deadline)
  const deadlineStr = formatDeadline(session.deadline)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.row}>
        <Clock size={20} color="#22c55e" />
        <Text style={styles.title}>Voting open</Text>
      </View>
      {groupName ? <Text style={styles.group}>{groupName}</Text> : null}
      <Text style={styles.deadline}>Ends at {deadlineStr}</Text>
      {countdown && countdown !== 'Ended' ? (
        <Text style={styles.countdown}>{countdown}</Text>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#166534' },
  group: { fontSize: 13, color: '#15803d', marginTop: 4 },
  deadline: { fontSize: 13, color: '#64748b', marginTop: 2 },
  countdown: { fontSize: 12, color: '#22c55e', marginTop: 4, fontWeight: '600' }
})
