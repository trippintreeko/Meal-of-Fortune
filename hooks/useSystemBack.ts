import { useCallback } from 'react'
import { BackHandler, Platform } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

export function useSystemBack (onBack: () => void, enabled = true) {
  useFocusEffect(
    useCallback(() => {
      if (!enabled || Platform.OS !== 'android') return
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack()
        return true
      })
      return () => sub.remove()
    }, [onBack, enabled])
  )
}

