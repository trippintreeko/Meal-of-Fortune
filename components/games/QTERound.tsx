import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import type { RoundGameProps } from '@/lib/game-registry'
import type { RoundResult } from '@/types/game-session'
import { Zap } from 'lucide-react-native'

const SAMPLE_BASE_ID = '11111111-1111-1111-1111-111111111101'
const SAMPLE_PROTEIN_ID = '22222222-2222-2222-2222-222222222201'
const SAMPLE_VEGETABLE_ID = '33333333-3333-3333-3333-333333333301'

export default function QTERound ({ roundPurpose, mealType, onComplete }: RoundGameProps) {
  const handlePick = () => {
    if (roundPurpose === 'base') {
      onComplete({ purpose: 'base', baseIds: [SAMPLE_BASE_ID] })
    } else if (roundPurpose === 'protein_vegetable') {
      onComplete({
        purpose: 'protein_vegetable',
        proteinIds: [SAMPLE_PROTEIN_ID],
        vegetableIds: [SAMPLE_VEGETABLE_ID]
      })
    } else {
      onComplete({ purpose: 'cooking_method', method: 'baked' })
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick-time event</Text>
      <Text style={styles.subtitle}>
        {roundPurpose.replace('_', ' & ')} • {mealType}
      </Text>
      <Text style={styles.placeholder}>
        Tap buttons in sequence (cooking simulation) UI will go here
      </Text>
      <TouchableOpacity style={styles.button} onPress={handlePick}>
        <Zap size={24} color="#ffffff" />
        <Text style={styles.buttonText}>Complete & continue</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8 },
  placeholder: { fontSize: 14, color: '#94a3b8', marginTop: 24, textAlign: 'center' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 32
  },
  buttonText: { fontSize: 18, fontWeight: '700', color: '#ffffff' }
})
