# Meal of Fortune (Social Voting)

Meal of Fortune lets friends and family vote on what to eat. It uses Supabase for auth, database, and real-time updates.

**Enhanced voting flow (admin start, extend/cancel, schedule meal, calendar):** see [VOTING-SESSION-ENHANCEMENT.md](./VOTING-SESSION-ENHANCEMENT.md) for requirements, architecture, and implementation phases.

## What’s included

- **Database**: `supabase/migrations/20250130000000_meal_vote_schema.sql`
  - Tables: `users`, `friendships`, `meal_groups`, `group_members`, `voting_sessions`, `meal_suggestions`, `votes`, `notifications`
  - RLS on all tables, triggers for profile creation and vote counts, view `voting_history`
  - Realtime enabled for `meal_suggestions` and `votes`
- **Edge Functions**: `supabase/functions/`
  - `generate-friend-code` – generate friend codes (DB also generates on signup)
  - `process-voting-deadline` – cron: close past-deadline sessions, set winner, create notifications
  - `send-group-notification` – notify all members of a group
  - `validate-group-invite` – check group code and return group info
- **App**
  - **Social tab**: Hub for sign in / sign up, “My groups”, “Notifications”
  - **Auth**: `app/social/login.tsx`, `app/social/register.tsx` (Supabase Auth email/password)
  - **Groups**: `app/social/groups.tsx`, `app/social/join-group.tsx`, `app/social/group/[id].tsx`
  - **Voting**: `app/social/session/[id].tsx` (suggestions, vote, real-time), `app/social/results/[id].tsx`
  - **Notifications**: `app/social/notifications.tsx`
  - **Components**: `VotingSessionCard`, `SuggestionList`, `FriendCodeScanner` (code input)

## Setup

1. **Apply migration**

   - In Supabase: SQL Editor → run `supabase/migrations/20250130000000_meal_vote_schema.sql`
   - Or with Supabase CLI: `supabase db push` (or link project and run migrations)

2. **Realtime**

   - Migration adds `meal_suggestions` and `votes` to `supabase_realtime` publication. If your project already has a custom publication, add these tables there instead.

3. **Edge Functions**

   - Deploy: `supabase functions deploy generate-friend-code` (and same for the other three)
   - Cron for `process-voting-deadline`: in Supabase Dashboard → Edge Functions → Cron (or use an external cron that calls the function URL with the service key).

4. **App**

   - `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (or use `app.config.js` + `expo.extra` as in the rest of the app).

5. **Push notifications (optional)**
   - Expo Notifications is already a dependency. For “push for all activities”:
     - Configure `expo-notifications` in `app.config.js` (e.g. `androidMode`, `iosDisplayForeground`).
     - Store push tokens (e.g. in a `user_push_tokens` table or in `users`) and call Expo Push API from an Edge Function when creating rows in `notifications`.

## Flows

- **Sign up** → Supabase Auth → trigger creates `users` row with generated `friend_code`.
- **Create/join group** → Create group (name + generated `group_code`) or join via `join_group_by_code` RPC.
- **Start voting** → Admin starts a session with deadline (e.g. 8 PM); group’s `active_voting_session` is set.
- **Suggest & vote** → Members add suggestions; each member has one vote per session. Realtime subscription refreshes suggestions and counts.
- **Deadline** → Run `process-voting-deadline` (cron) to close sessions, set winner, insert `result_ready` notifications.

## RLS summary

- **users**: Select/update own; friends can select basic info.
- **friendships**: Full access for either user or friend.
- **meal_groups / group_members**: Members can read; admins can manage members; users can insert themselves (join) via RPC.
- **voting_sessions, meal_suggestions, votes**: Group members can read/write as per schema (e.g. one vote per user per session enforced by UNIQUE and app logic).
- **notifications**: Users read/update own; insert allowed for in-app and backend use.
