import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native'

type FriendCodeScannerProps = {
  value: string
  onChangeText: (t: string) => void
  onSubmit?: () => void
  placeholder?: string
  label?: string
}

export default function FriendCodeScanner ({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'ABC-1234',
  label = 'Friend or group code'
}: FriendCodeScannerProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(t) => onChangeText(t.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
        />
        {onSubmit ? (
          <TouchableOpacity style={styles.button} onPress={onSubmit}>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b'
  },
  button: { backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '700' }
})
