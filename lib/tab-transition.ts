/**
 * Tracks last focused tab index for direction-aware header slide animations.
 * Tab order: Play=0, Calendar=1, Social=2, Profile=3.
 */
let lastFocusedTabIndex = 0

export function getLastFocusedTabIndex (): number {
  return lastFocusedTabIndex
}

export function setLastFocusedTabIndex (index: number): void {
  lastFocusedTabIndex = index
}
