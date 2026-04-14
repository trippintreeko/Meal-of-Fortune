import React, { type ErrorInfo, type ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'

type Props = {
  children: ReactNode
  onExit: () => void
}

type State = { hasError: boolean }

/**
 * Catches render errors in a minigame so we can undo game-added "don't want today" and leave the flow.
 */
export default class GameRoundErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError (): State {
    return { hasError: true }
  }

  componentDidCatch (error: Error, info: ErrorInfo): void {
    console.error('Minigame error:', error.message, info.componentStack)
    this.props.onExit()
  }

  render (): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>Taking you home…</Text>
          <TouchableOpacity style={styles.btn} onPress={() => this.props.onExit()} accessibilityRole="button">
            <Text style={styles.btnText}>Go home</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  sub: { fontSize: 15, color: '#64748b', marginBottom: 20 },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#22c55e' },
  btnText: { fontSize: 16, fontWeight: '600', color: '#fff' }
})
