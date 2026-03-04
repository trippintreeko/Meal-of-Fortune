import { Redirect } from 'expo-router'
import { useSocialAuth } from '@/hooks/useSocialAuth'

export default function SocialIndex () {
  const { isAuthenticated, loading } = useSocialAuth()

  if (loading) return null
  if (isAuthenticated) return <Redirect href="/social/groups" />
  return <Redirect href="/social/login" />
}
