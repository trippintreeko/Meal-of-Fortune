# Voting History Calendar – Change Log & Removal Guide

This doc lists **every file added or changed** for the Group Voting History Calendar and auto-expiration feature. Use it to understand the feature footprint or to remove the feature from the app.

---

## Current status: FEATURE DISABLED (commented out)

The feature is **currently disabled** in the app so the group screen works without it. All UI/type changes are commented out or reverted; the code to restore is kept in comments.

| What           | Where                                           | How to re-enable                                                                                                                                                                                                                 |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Group screen   | `app/social/group/[id].tsx`                     | Uncomment the block at the bottom; re-add tab layout, `GroupVotingHistory` import and usage, `activeTab`, `retentionDays`, and tab styles (see comment in file).                                                                 |
| MealGroup type | `types/social.ts`                               | Uncomment `voting_history_retention_days?: number` on `MealGroup`.                                                                                                                                                               |
| History types  | `types/social.ts`                               | Uncomment the `VotingHistoryEntry` and `VotingHistoryFilters` type blocks. Then remove the local `VotingHistoryEntry` type from `GroupVotingHistory.tsx` and restore `import type { VotingHistoryEntry } from '@/types/social'`. |
| Components     | `GroupVotingHistory.tsx`, `HistorySettings.tsx` | No code commented inside these files; they are just not imported. Re-enabling the group page (above) uses them again. You can remove the "FEATURE DISABLED" banner at the top of each if you re-enable.                          |

**Migration and edge functions** are unchanged (migration may already be applied). Leaving them in place is fine; the app simply does not call the history RPCs or show the History tab until you re-enable as above.

---

## 1. New Files (delete to remove feature)

| File                                                             | Purpose                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `supabase/migrations/20250215000000_voting_history_calendar.sql` | Migration: retention column, archive columns, view, RPCs, indexes, backfill                 |
| `components/social/voting/GroupVotingHistory.tsx`                | History list + settings trigger; calls `get_group_voting_history`                           |
| `components/social/voting/HistorySettings.tsx`                   | Modal for admin retention (1 month / 3 / 6 / 1 year); calls `update_group_voting_retention` |
| `supabase/functions/archive-old-votes/index.ts`                  | Edge function: calls `archive_old_voting_sessions()` (for cron)                             |
| `supabase/functions/purge-archived-votes/index.ts`               | Edge function: calls `purge_archived_voting_sessions()` (for cron)                          |
| `docs/VOTING-HISTORY-CRON.md`                                    | Cron setup for the two edge functions                                                       |
| `docs/VOTING-HISTORY-CALENDAR-CHANGES.md`                        | This file                                                                                   |

---

## 2. Modified Files (revert these edits to remove feature)

### `types/social.ts`

- **MealGroup:** add optional `voting_history_retention_days?: number`.
- **After VotingSessionWithDetails:** add types `VotingHistoryEntry` and `VotingHistoryFilters` (full blocks).

**To remove:** Delete `voting_history_retention_days?` from `MealGroup`. Delete the `VotingHistoryEntry` and `VotingHistoryFilters` type definitions.

---

### `app/social/group/[id].tsx`

- **Imports:** `History`, `UserCircle` from lucide; `GroupVotingHistory` from `@/components/social/voting/GroupVotingHistory`.
- **State:** `activeTab: TabKey` (`'votes' | 'history' | 'members'`); `retentionDays` derived from `group.voting_history_retention_days ?? 180`.
- **Layout:** Tab bar (Votes | History | Members); `headerCard`; content area by tab.
- **Votes tab:** ScrollView with Start vote / Open active vote / View results (and `StartVoteModal`).
- **History tab:** Renders `<GroupVotingHistory groupId={...} groupName={...} retentionDays={...} isAdmin={...} onRetentionSaved={loadGroup} />`.
- **Members tab:** ScrollView with members list (same as old “Members” card).
- **Styles:** `headerCard`, `tabBar`, `tab`, `tabActive`, `tabText`, `tabTextActive`, `content`, `scroll`, `scrollContent`, `card`, `sectionTitle`, `memberRow`, `memberName`, `role`, `button`, `resultsButton`, `buttonText`.

**To remove:** Revert to a single ScrollView layout (no tabs). Remove `GroupVotingHistory` import and usage, `activeTab` state, tab bar, and History tab. Put the Votes content and Members card back in one scroll (as before). Remove `retentionDays` and any History-specific styles. Keep Members as a single card on the main screen if that was the original design.

---

## 3. Database Objects (from migration – optional revert)

If you **remove the feature from the app only** (no DB revert), you can leave the DB as-is. The app will simply stop calling the new RPCs and the new columns/view will be unused.

If you want to **revert the database** (e.g. clean schema):

1. **Drop RPCs (in reverse order of creation):**

   - `update_group_voting_retention(p_group_id, p_retention_days)`
   - `purge_archived_voting_sessions()`
   - `archive_old_voting_sessions()`
   - `get_group_voting_history(...)`

2. **Drop view:**  
   `DROP VIEW IF EXISTS voting_history_view;`

3. **Drop indexes (optional):**

   - `idx_voting_sessions_group_created`
   - `idx_voting_sessions_archived`
   - `idx_voting_sessions_group_archived_created`

4. **Drop columns (optional; will lose retention/archive data):**
   - `voting_sessions`: `archived_at`, `archived_reason`
   - `meal_groups`: `voting_history_retention_days`

Note: The migration also **backfills** `archived_at` for old sessions. Reverting columns does not “un-archive” them; that data is overwritten.

---

## 4. Edge Functions & Cron

- **Unschedule cron** for `archive-old-votes` and `purge-archived-votes` (Supabase or external scheduler).
- **Delete or stop deploying** the function folders:
  - `supabase/functions/archive-old-votes/`
  - `supabase/functions/purge-archived-votes/`

---

## 5. Quick Removal Checklist

- [ ] Remove History tab and tab bar from `app/social/group/[id].tsx`; restore single-page group layout.
- [ ] Delete `components/social/voting/GroupVotingHistory.tsx`.
- [ ] Delete `components/social/voting/HistorySettings.tsx`.
- [ ] In `types/social.ts`, remove `voting_history_retention_days?` from `MealGroup` and remove `VotingHistoryEntry` and `VotingHistoryFilters`.
- [ ] Unschedule and remove or stop deploying `archive-old-votes` and `purge-archived-votes` edge functions.
- [ ] Optionally run a new migration to drop the RPCs, view, indexes, and columns listed in §3.
- [ ] Optionally delete `docs/VOTING-HISTORY-CRON.md` and this file.

---

## 6. RPCs and View (reference)

| Name                             | Type     | Used by                              |
| -------------------------------- | -------- | ------------------------------------ |
| `get_group_voting_history`       | function | `GroupVotingHistory.tsx`             |
| `update_group_voting_retention`  | function | `HistorySettings.tsx`                |
| `archive_old_voting_sessions`    | function | Edge function `archive-old-votes`    |
| `purge_archived_voting_sessions` | function | Edge function `purge-archived-votes` |
| `voting_history_view`            | view     | Optional; RPC reads from base tables |

No other app code or migrations depend on `voting_history_view`; the history UI uses only `get_group_voting_history`.
