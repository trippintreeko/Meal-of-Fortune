import { useEffect } from 'react'
import { usePathname } from 'expo-router'
import { clearGameAddedNotTodayFromPreferences } from '@/store/game-session'

/**
 * When the user is not on minigame rounds or the swipe-results screen, strip any
 * game-added "don't want today" IDs so the food gallery stays usable after crashes or bail-outs.
 */
export default function GameNotTodayRouteCleanup () {
  const pathname = usePathname()

  useEffect(() => {
    const inRounds = pathname.includes('/game/round/')
    const inResults = pathname === '/game/results'
    if (inRounds || inResults) return
    void clearGameAddedNotTodayFromPreferences()
  }, [pathname])

  return null
}
