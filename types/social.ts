import type { NotificationSettings, PrivacySettings } from './profile-settings'

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export type FriendCategory = {
  id: string
  name: string
  color: string
}

export type FriendWithDetails = {
  friend_id: string
  username: string
  friend_code: string | null
  status: FriendshipStatus
  categories: FriendCategory[]
  created_at: string
}
export type GroupMemberRole = 'member' | 'admin'
export type SessionStatus = 'active' | 'completed' | 'cancelled'
export type PriceRangeType = '$' | '$$' | '$$$' | '$$$$'
export type NotificationType =
  | 'friend_request'
  | 'suggestion_added'
  | 'vote_cast'
  | 'deadline_approaching'
  | 'result_ready'
  | 'group_invite'
  | 'group_join_request'

export type UserProfile = {
  id: string
  auth_id: string | null
  username: string
  friend_code: string | null
  email: string | null
  avatar_url: string | null
  dietary_restrictions: string[]
  favorite_cuisines: string[]
  created_at: string
  updated_at: string
  /** Optional extended fields from profile settings */
  bio?: string | null
  email_verified?: boolean
  theme?: 'light' | 'dark' | 'system'
  accent_color?: string
  font_size?: 'small' | 'medium' | 'large'
  reduce_motion?: boolean
  notification_settings?: NotificationSettings
  privacy_settings?: PrivacySettings
  disliked_foods?: string[]
  price_preference?: number
  spice_tolerance?: number
  portion_preference?: 'small' | 'medium' | 'large'
  dont_want_today?: string[]
  dont_want_expires?: string | null
  two_factor_enabled?: boolean
  connected_accounts?: { google?: string; apple?: string }
  last_password_change?: string | null
}

export type Friendship = {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
}

export type MealGroup = {
  id: string
  name: string
  group_code: string | null
  created_by: string | null
  created_at: string
  active_voting_session: string | null
  // voting_history_retention_days?: number  // Voting History Calendar (disabled) – see docs/VOTING-HISTORY-CALENDAR-CHANGES.md
}

export type GroupMember = {
  id: string
  group_id: string
  user_id: string
  role: GroupMemberRole
  joined_at: string
}

export type GroupJoinRequestStatus = 'pending' | 'accepted' | 'denied'

export type GroupJoinRequest = {
  id: string
  group_id: string
  user_id: string
  status: GroupJoinRequestStatus
  created_at: string
  username?: string
}

export type VotingSession = {
  id: string
  group_id: string
  initiated_by: string | null
  status: SessionStatus
  deadline: string
  created_at: string
  winner_suggestion_id: string | null
  decided_at: string | null
  tiebreaker_used?: boolean
  description?: string | null
  scheduled_meal_date?: string | null
  scheduled_meal_slot?: string | null
}

export type MealSuggestion = {
  id: string
  session_id: string
  user_id: string | null
  suggestion: string
  category: string | null
  price_range: PriceRangeType | null
  dietary_tags: string[]
  location: { lat: number; lng: number } | null
  vote_count: number
  created_at: string
}

export type Vote = {
  id: string
  session_id: string
  user_id: string
  suggestion_id: string
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string
  data: Record<string, unknown>
  read: boolean
  expires_at: string | null
  created_at: string
}

export type MealSuggestionWithMeta = MealSuggestion & {
  username?: string
  user_voted?: boolean
}

export type VotingSessionWithDetails = VotingSession & {
  group_name?: string
  meal_suggestions?: MealSuggestionWithMeta[]
  votes?: Vote[]
}

// Voting History Calendar (disabled) – see docs/VOTING-HISTORY-CALENDAR-CHANGES.md
// export type VotingHistoryEntry = {
//   id: string
//   group_id: string
//   status: SessionStatus
//   deadline: string
//   decided_at: string | null
//   winner_suggestion_id: string | null
//   description: string | null
//   scheduled_meal_date: string | null
//   scheduled_meal_slot: string | null
//   created_at: string
//   winner_text: string | null
//   winner_suggested_by: string | null
//   total_voters: number
//   total_votes: number
//   total_suggestions: number
// }
//
// export type VotingHistoryFilters = {
//   limit?: number
//   offset?: number
//   fromDate?: string
//   toDate?: string
//   status?: SessionStatus
// }
