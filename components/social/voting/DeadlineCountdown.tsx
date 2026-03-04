'use client'

import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Clock } from 'lucide-react-native'

type DeadlineCountdownProps = {
  deadline: string // ISO
  ended?: boolean
  onDeadlineReached?: () => void
}

function formatTimeLeft (ms: number): string {
  if (ms <= 0) return 'Ended'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    const h = hours % 24
    if (h === 0) return `${days}d left`
    return `${days}d ${h}h left`
  }
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export default function DeadlineCountdown ({ deadline, ended }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    const deadlineDate = new Date(deadline)
    const update = () => {
      const ms = deadlineDate.getTime() - Date.now()
      setTimeLeft(formatTimeLeft(ms))
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [deadline])

  if (ended) {
    return (
      <View style={styles.wrapper}>
        <Clock size={20} color="#64748b" />
        <Text style={styles.text}>Voting has ended</Text>
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <Clock size={20} color="#22c55e" />
      <Text style={styles.text}>
        {timeLeft} • Ends {new Date(deadline).toLocaleDateString()} at{' '}
        {new Date(deadline).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 14, color: '#64748b' }
})
