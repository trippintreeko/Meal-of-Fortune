import { useMemo, useRef } from 'react'
import { Dimensions, PanResponder, View } from 'react-native'
import type { ReactNode } from 'react'
import { useRouter } from 'expo-router'

type Props = {
  tabIndex: number
  children: ReactNode
  routes?: string[]
  isEnabled?: boolean
  isEdgeOnly?: boolean
  edgeWidth?: number
}

const DEFAULT_ROUTES = [
  '/(tabs)',
  '/(tabs)/calendar',
  '/(tabs)/social',
  '/(tabs)/profile'
]

export default function SwipeTabsContainer ({
  tabIndex,
  children,
  routes = DEFAULT_ROUTES,
  isEnabled = true,
  isEdgeOnly = true,
  edgeWidth = 24
}: Props) {
  const router = useRouter()
  const startXRef = useRef(0)
  const startYRef = useRef(0)

  const panResponder = useMemo(() => {
    if (!isEnabled) return null

    return PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (isEdgeOnly) {
          const screenWidth = Dimensions.get('window').width
          const x0 = gesture.x0
          const isFromEdge = x0 <= edgeWidth || x0 >= (screenWidth - edgeWidth)
          if (!isFromEdge) return false
        }

        // Avoid stealing vertical scroll and small jitters
        const dx = Math.abs(gesture.dx)
        const dy = Math.abs(gesture.dy)
        if (dx < 18) return false
        if (dy > 14) return false
        return dx > dy
      },
      onPanResponderGrant: (_evt, gesture) => {
        startXRef.current = gesture.x0
        startYRef.current = gesture.y0
      },
      onPanResponderRelease: (_evt, gesture) => {
        const dx = gesture.moveX - startXRef.current
        const dy = gesture.moveY - startYRef.current

        // Intentional swipe only
        if (Math.abs(dx) < 60) return
        if (Math.abs(dy) > 50) return

        const nextIndex = dx < 0 ? tabIndex + 1 : tabIndex - 1
        const nextRoute = routes[nextIndex]
        if (!nextRoute) return

        router.push(nextRoute)
      }
    })
  }, [edgeWidth, isEdgeOnly, isEnabled, routes, router, tabIndex])

  // We can't navigate from here without a router reference; see wrapper component below.
  if (!panResponder) {
    return <View style={{ flex: 1 }}>{children}</View>
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  )
}

