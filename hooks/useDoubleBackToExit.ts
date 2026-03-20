import { useCallback, useRef } from 'react'
import { BackHandler, Platform, ToastAndroid } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

const EXIT_DELAY_MS = 2000
const MESSAGE = 'Use a double swipe back to close the app'

export function useDoubleBackToExit () {
  const lastBackTimeRef = useRef(0)

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return

      const onBack = () => {
        const now = Date.now()
        if (now - lastBackTimeRef.current < EXIT_DELAY_MS) {
          BackHandler.exitApp()
          return true
        }
        lastBackTimeRef.current = now
        ToastAndroid.show(MESSAGE, ToastAndroid.SHORT)
        return true
      }

      const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
      return () => sub.remove()
    }, [])
  )
}
