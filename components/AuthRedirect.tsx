'use client'

import { useEffect } from 'react'
import { useSegments, useRouter } from 'expo-router'
import { useSocialAuth } from '@/hooks/useSocialAuth'

const PROTECTED_SEGMENTS: [string, string?][] = [
  ['profile', 'settings'],
  ['social', 'friends'],
  ['social', 'groups'],
  ['social', 'add-friend'],
  ['social', 'join-group'],
  ['social', 'share-to-vote']
]

const PUBLIC_SETTINGS_PAGES = ['terms', 'privacy-policy']

function isProtected (segments: string[]): boolean {
  const first = segments[0]
  const second = segments[1]
  const third = segments[2]
  if (first === 'profile' && second === 'settings' && third && PUBLIC_SETTINGS_PAGES.includes(third)) return false
  for (const [a, b] of PROTECTED_SEGMENTS) {
    if (first === a && (b == null || second === b)) return true
  }
  return false
}

export default function AuthRedirect () {
  const segments = useSegments()
  const router = useRouter()
  const { isAuthenticated, loading } = useSocialAuth()

  useEffect(() => {
    if (loading) return
    if (isAuthenticated) return
    if (!isProtected(segments as string[])) return
    router.replace('/social/login')
  }, [loading, isAuthenticated, segments, router])

  return null
}
