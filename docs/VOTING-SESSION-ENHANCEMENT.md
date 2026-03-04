# Voting Session Enhancement – Requirements & Architecture

This document defines the enhanced voting flow, how parts of the app interact, and the implementation structure. Goal: **admin starts a vote → sets deadline → suggestions from “Meals I want” → leave and return to extend/cancel, add participants → after vote, schedule meal and add to calendar as a voted meal.**

**Post-voting phase (after deadline):** Results page with statistics for all members; “Add to My Calendar” for any suggestion; admin “Schedule for Group” (send as suggestion members can accept/decline, or set group meal plan and set days). See **§11–20** and **§20 (Prompt summary for Cursor AI)**.

---

## 1. User journey (target flow)

1. **Admin starts vote** (from group detail)

   - Tap “Start voting”.
   - Set deadline (default: today 8 PM; can pick date/time).
   - Optional: description/theme for the vote.
   - Optional (later): recurrence (daily/weekly).
   - Session is created; `meal_groups.active_voting_session` is set; admin is taken to session screen.

2. **Suggestions**

   - **Meals I want**: From home/calendar, user selects saved meals → “Share for votes” → picks group with active vote → suggestions added to session (existing `share-to-vote` + `add_meal_suggestion`).
   - **Inline**: On session screen, anyone can type a suggestion (existing).
   - (Later: templates, previous winners.)

3. **Voting**

   - Participants vote (one vote per user per session); real-time updates (existing).
   - **Admin can leave and return** to the same session to:
     - **Extend deadline** (new RPC).
     - **Cancel vote** (new RPC; set status `cancelled`, clear `active_voting_session`).
     - **Add participants** (invite group members who aren’t “in” the vote yet; optional `voting_participants` or rely on group_members + notifications).

4. **Vote concludes**

   - Cron (`process-voting-deadline`) closes session, sets winner, sends notifications (existing).
   - User opens **Results** screen.

5. **Post-vote: schedule meal**

   - On Results (or from session after completion): “Schedule meal”:
     - Pick **date** and **meal slot** (breakfast/lunch/dinner).
     - Option: “Add to my calendar” only vs “Add for all participants” (later).
   - App writes a **calendar event** with voting metadata (session id, winner text, vote count, “decided by vote”) so the calendar shows which meals came from a vote.

6. **Calendar**
   - Calendar events created from a vote include:
     - `votingSessionId`, `voteWinnerId`, `voteCount`, `totalVoters`, `suggestedBy` (optional).
   - Day view shows these like other meals; user can see “decided by vote” and link back to session/result if desired.

---

## 2. Current state vs target

| Area               | Current                                                                         | Target                                                                                            |
| ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Start vote**     | Group detail: one button, deadline = today/tomorrow 8 PM                        | Modal/screen: pick deadline (date + time), optional description                                   |
| **Session screen** | Load session, suggest inline, vote, real-time                                   | + Admin: extend deadline, cancel vote; + deadline countdown; (later: add participants)            |
| **Suggestions**    | Inline text + Share from “Meals I want”                                         | Same + (later: templates, previous winners)                                                       |
| **Results**        | Winner text, back to group                                                      | + “Schedule meal” (date + slot) → add to calendar with vote metadata                              |
| **Calendar**       | `CalendarEvent`: date, slot, title, savedMealId, etc.                           | + Optional voting metadata (votingSessionId, winner text, vote count) for “from vote” events      |
| **DB**             | `voting_sessions`: group_id, status, deadline, winner_suggestion_id, decided_at | + description, scheduled_meal_date, scheduled_meal_slot; (later: recurrence, voting_participants) |

---

## 3. How the parts interact

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCREENS                                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  group/[id]     → Start vote (open start modal → set deadline/desc)           │
│                   → Create session (RPC or insert) → set active_voting_session│
│                   → Navigate to session/[id]                                  │
│  session/[id]   → get_session_detail → show suggestions, votes, deadline     │
│                   → Admin: extend_voting_deadline, cancel_voting_session      │
│                   → add_meal_suggestion, set_my_vote                          │
│                   → Realtime: meal_suggestions, votes, voting_sessions        │
│  share-to-vote  → get_my_groups (active only) → add_meal_suggestion per meal  │
│  results/[id]   → get session + winner → "Schedule meal" → date/slot picker    │
│                   → schedule_winning_meal (RPC) or client-only calendar add     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  RPCs / DB                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  start_voting_session(group_id, deadline, description?) → session_id          │
│  get_session_detail(session_id) → { session, suggestions, votes }           │
│  extend_voting_deadline(session_id, new_deadline)                            │
│  cancel_voting_session(session_id)                                           │
│  add_meal_suggestion(session_id, text)                                       │
│  set_my_vote(session_id, suggestion_id)                                      │
│  schedule_winning_meal(session_id, meal_date, meal_slot) → optional sync      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  CALENDAR STORE (client)                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  addEvent({ ...CalendarEvent, votingSessionId?, voteWinnerId?, voteCount?,    │
│             totalVoters?, suggestedBy? })                                     │
│  getEventsForDate(date) → includes voting events                              │
│  Calendar UI shows event; can show "From group vote" + link to result        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  EDGE / CRON                                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  process-voting-deadline: active sessions past deadline → completed,          │
│                           set winner_suggestion_id, result_ready notifications│
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Group detail** and **session** use the same session id; **share-to-vote** uses `active_voting_session` from group.
- **Results** reads the same session (completed) and winner; scheduling writes only to calendar store (and optionally RPC for `scheduled_meal_date`/`scheduled_meal_slot`).
- **Calendar** is client-side (AsyncStorage); “add to all participants’ calendars” would require backend or each client to add locally when they open the app (e.g. from notification).

---

## 4. Database schema changes

### 4.1 Extend `voting_sessions`

```sql
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS scheduled_meal_date DATE;
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS scheduled_meal_slot TEXT;
-- Optional later: recurrence_pattern, recurrence_interval, recurrence_days, max_participants
```

- `description`: optional theme/notes.
- `scheduled_meal_date` / `scheduled_meal_slot`: set when user “schedules meal” from results (persisted so we can show “Scheduled for …” and sync to calendar with same intent).

### 4.2 Optional: `voting_participants`

For “add participants during vote”, we can either:

- **A)** Rely on **group_members**: anyone in the group can see and join the vote; admin “adds” by inviting more people to the group (or we add a separate invite flow). No new table.
- **B)** Add **voting_participants** (session_id, user_id, status) to explicitly invite users who are not in the group (e.g. one-off vote with friends). Phase 2.

Recommendation: **Phase 1**: no `voting_participants`; participants = group members. Phase 2: add table + “Add participant” UI if needed.

### 4.3 Optional: `meal_suggestions` source

```sql
ALTER TABLE meal_suggestions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE meal_suggestions ADD COLUMN IF NOT EXISTS source_meal_id TEXT;
```

- `source`: `'inline' | 'meals_i_want' | 'template'` (later).
- `source_meal_id`: id from calendar saved meal or template. Useful for “add to Meals I want” from a losing suggestion.

Can be added in a later phase.

---

## 5. RPCs (and one insert path)

| RPC                        | Purpose                                                                                                        | Called from                        |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **start_voting_session**   | Create session with deadline (and optional description). Set `active_voting_session` on group.                 | group/[id] (Start vote modal)      |
| **get_session_detail**     | Return session + suggestions + votes (existing).                                                               | session/[id], results (for winner) |
| **extend_voting_deadline** | Update `voting_sessions.deadline`; admin only.                                                                 | session/[id] (admin controls)      |
| **cancel_voting_session**  | Set status = `cancelled`, clear `meal_groups.active_voting_session`.                                           | session/[id] (admin)               |
| **add_meal_suggestion**    | Add suggestion (existing).                                                                                     | session/[id], share-to-vote        |
| **set_my_vote**            | Set/change vote (existing).                                                                                    | session/[id]                       |
| **schedule_winning_meal**  | Set `scheduled_meal_date`, `scheduled_meal_slot` on session; return winner info for client to add to calendar. | results/[id] (Schedule meal)       |

- **start_voting_session**: same as current insert + update, but with optional description and one place for permission checks (admin only).
- **schedule_winning_meal**: idempotent; client uses return value to call `calendarStore.addEvent({ ...event, votingSessionId, voteWinnerId, voteCount, totalVoters })`.

---

## 6. Screen and component structure

### 6.1 Screens

| Screen                          | Changes                                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **app/social/group/[id].tsx**   | Replace “Start voting (deadline 8 PM)” with “Start vote” → open **StartVoteModal** (deadline picker, optional description) → call `start_voting_session` → navigate to session. |
| **app/social/session/[id].tsx** | Add admin bar: extend deadline, cancel vote. Add **DeadlineCountdown**; subscribe to `voting_sessions` for deadline/status. Keep existing suggest/vote and realtime.            |
| **app/social/results/[id].tsx** | Add “Schedule meal” button → **ScheduleMealModal** (date + slot) → call `schedule_winning_meal` → add event to calendar store with voting metadata → close modal.               |
| **app/social/share-to-vote**    | No change (already adds from Meals I want).                                                                                                                                     |

### 6.2 New components (under `components/social/` or `components/social/voting/`)

| Component               | Responsibility                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **StartVoteModal**      | Deadline (date + time), optional description; “Start vote” calls RPC and navigates.                                       |
| **DeadlineCountdown**   | Shows time left; admin sees “Extend” button.                                                                              |
| **VotingAdminControls** | Extend deadline, Cancel vote (with confirm). Shown only to admin.                                                         |
| **ScheduleMealModal**   | Date picker, slot (breakfast/lunch/dinner); “Add to calendar” calls RPC then calendarStore.addEvent with voting metadata. |

Optional later: RecurrencePicker, ParticipantManager, SuggestionSourcesTabs.

---

## 7. Calendar store integration

### 7.1 Types (`types/calendar.ts`)

```ts
// Extend CalendarEvent with optional voting metadata
export type CalendarEvent = {
  id: string;
  date: string;
  mealSlot: MealSlot;
  savedMealId: string | null;
  title: string;
  // ... existing fields ...
  // Voting (optional – set when event is created from a voting result)
  votingSessionId?: string;
  voteWinnerId?: string;
  voteCount?: number;
  totalVoters?: number;
  suggestedBy?: string;
};
```

### 7.2 Store (`store/calendar-store.ts`)

- **addEvent**: accept optional `votingSessionId`, `voteWinnerId`, `voteCount`, `totalVoters`, `suggestedBy`; persist with event.
- **getEventsForDate**: unchanged; events already include these fields.
- Optional: **getVotingEvents()** to filter events that have `votingSessionId` (e.g. for a “Voted meals” list).

No separate “VotingCalendarEvent” type required if we just extend `CalendarEvent` with optional fields.

### 7.3 Calendar UI

- When rendering an event, if `votingSessionId` is set, show a small “From group vote” label and optionally a link to `results/[sessionId]` (or session detail).

---

## 8. Implementation phases

### Phase 1 – Core (admin start, extend, cancel, schedule, calendar)

1. **Migration**: Add `description`, `scheduled_meal_date`, `scheduled_meal_slot` to `voting_sessions`.
2. **RPCs**: `start_voting_session`, `extend_voting_deadline`, `cancel_voting_session`, `schedule_winning_meal`.
3. **Group detail**: StartVoteModal with deadline (default 8 PM) and optional description; call `start_voting_session`.
4. **Session screen**: VotingAdminControls (extend + cancel); DeadlineCountdown; realtime on `voting_sessions` for deadline/status.
5. **Results screen**: ScheduleMealModal (date + slot) → `schedule_winning_meal` → calendarStore.addEvent with voting metadata.
6. **Calendar types + store**: Add optional voting fields to `CalendarEvent` and `addEvent`.
7. **Calendar UI**: Show “From group vote” (and optional link) for events with `votingSessionId`.

### Phase 2 – Optional

- Recurrence (recurrence_pattern, recurrence_interval on session; recurring calendar events).
- voting_participants table + “Add participant” (invite by user id or link).
- meal_suggestions.source + source_meal_id; “Add to Meals I want” from results.
- “Add to all participants’ calendars” (notify + each client adds locally, or backend job).

---

## 9. File and RPC checklist

### New migration

- `supabase/migrations/YYYYMMDD_voting_session_enhancements.sql`:
  - ALTER voting_sessions (description, scheduled_meal_date, scheduled_meal_slot).
  - CREATE start_voting_session, extend_voting_deadline, cancel_voting_session, schedule_winning_meal.

### New/updated files

- `components/social/StartVoteModal.tsx` (or under `components/social/voting/`).
- `components/social/DeadlineCountdown.tsx`.
- `components/social/VotingAdminControls.tsx`.
- `components/social/ScheduleMealModal.tsx`.
- `app/social/group/[id].tsx` – use StartVoteModal.
- `app/social/session/[id].tsx` – use DeadlineCountdown, VotingAdminControls; subscribe to voting_sessions.
- `app/social/results/[id].tsx` – use ScheduleMealModal, calendar store.
- `types/calendar.ts` – optional voting fields on CalendarEvent.
- `store/calendar-store.ts` – addEvent accepts voting fields.
- Calendar day view (or event row) – show “From group vote” when `votingSessionId` is set.

### Existing (unchanged or minimal)

- `get_session_detail`, `add_meal_suggestion`, `set_my_vote` – keep as is.
- `share-to-vote` – no change.
- `process-voting-deadline` – no change (already sets winner and notifications).

---

## 10. Success criteria

- Admin can start a vote from group detail with a chosen deadline and optional description.
- Admin can extend the deadline and cancel the vote from the session screen.
- Suggestions still come from “Meals I want” (share-to-vote) and from inline entry.
- After the vote, results screen offers “Schedule meal”; user picks date and slot; event is added to the calendar with voting metadata.
- Calendar shows voted meals with “From group vote” (and optional link to result).
- All changes are consistent with existing auth (useSocialAuth), Supabase RPCs, and realtime subscriptions.

This gives a single reference for requirements and structure; implementation can follow Phase 1 in the order above.

---

# Post-Voting Phase – Requirements & Architecture

This section extends the voting flow **after the deadline has elapsed**. Goal: **Results page shows statistics to all members and lets them add any suggestion to their calendar; admin can send the winning meal (or chosen meals) to the group as a suggestion members can accept or decline, and can set the specific days the group will eat that meal.**

---

## 11. Post-vote user journey

1. **Deadline passes**  
   Cron sets session `status = 'completed'`, `winner_suggestion_id`; `result_ready` notifications sent (existing).

2. **Results page (all members)**

   - **Statistics**: Total participants, vote count per suggestion, percentage breakdown, who suggested each item.
   - **List of all suggestions** (winner highlighted).
   - **“Add to My Calendar”** on **any** suggestion (not only winner): opens date/slot picker → adds to **personal** calendar with voting metadata (`votingSessionId`, `suggestionId`, `isVotedMeal`, optionally `isWinner`).

3. **Results page (admin only)**

   - **“Schedule for Group”**:
     - Pick one or more **(date, slot)** for the winning meal (or chosen suggestions).
     - Option: **“Send as suggestion”** → creates suggested events for each group member; they can accept or decline.
     - Option: **“Set as group meal plan”** → same as today’s “schedule winning meal” (persist on session + each member adds to own calendar when they open results or via notification).
   - **“View group schedule”** (Phase 2): overlay of proposed schedule and who accepted/declined.

4. **Members and suggested meals**

   - When admin sends as suggestion: member sees **suggested** meals (inbox or calendar).
   - **Accept** → event is added to their calendar with voting metadata.
   - **Decline** → suggestion is dismissed (no event).
   - Optional: **Reschedule** (change date/slot) then accept.

5. **Calendar**
   - Events from votes show **“From group vote”** (existing).
   - Events from **admin-suggested** group meals show **“Suggested by group”** or similar; accept/decline from day view or inbox.

---

## 12. Results page layout (target)

| Audience  | Section / action                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **All**   | Title: “Voting result”                                                                                                                                   |
| **All**   | **Statistics**: total participants, total votes cast, list of suggestions with vote count, %, suggester name; winner clearly marked.                     |
| **All**   | **“Add to My Calendar”** per suggestion → date/slot picker → `calendarStore.addEvent` with `votingSessionId`, `suggestionId`, `isVotedMeal`, `isWinner`. |
| **Admin** | **“Schedule for Group”** (primary) → opens **ScheduleGroupMealModal**.                                                                                   |
| **Admin** | (Phase 2) **“View group schedule”** → overlay of scheduled/suggested meals and acceptance.                                                               |

- **Data**: Use `get_session_detail` (session, suggestions with usernames) + **get_voting_statistics(session_id)** for participant count and percentages.
- **Permissions**: Results visible to all group members; only group admins see “Schedule for Group”.

---

## 13. Database schema (post-vote)

### 13.1 Extend `voting_sessions`

```sql
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT FALSE;
ALTER TABLE voting_sessions ADD COLUMN IF NOT EXISTS schedule_published_at TIMESTAMPTZ;
```

- `results_published`: set when cron completes or when first result is viewed (optional).
- `schedule_published_at`: when admin first published a group schedule/suggestion for this session.

### 13.2 Table: `scheduled_group_meals`

Stores admin-scheduled meals per member (suggestion + date/slot + accept/decline).

```sql
CREATE TABLE scheduled_group_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_session_id UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  suggestion_id UUID NOT NULL REFERENCES meal_suggestions(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  meal_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'scheduled'
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by_admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(voting_session_id, user_id, scheduled_date, meal_slot)
);

CREATE INDEX idx_scheduled_group_meals_session ON scheduled_group_meals(voting_session_id);
CREATE INDEX idx_scheduled_group_meals_user ON scheduled_group_meals(user_id);
```

- **status**: `pending` = suggested, not yet accepted/declined; `accepted` = member added to calendar; `declined` = member declined; `scheduled` = admin committed for group (optional distinction).
- **user_id**: the group member this row is for.
- **created_by_admin_id**: admin who created the suggestion/schedule.

### 13.3 Notifications (extend enum and usage)

Add to `notification_type` (if not already present):

- `vote_results_ready` (existing as `result_ready`)
- `group_meal_suggested` – admin suggested a meal for your calendar
- `group_meal_scheduled` – meal was added to your calendar by admin
- `meal_acceptance_required` – optional; “Response needed for suggested meal”

Use existing `notifications` table; trigger or Edge Function creates rows when admin calls `schedule_group_meals` with `send_as_suggestion` / `notify_members`.

---

## 14. RPCs (post-vote)

| RPC                                | Purpose                                                                                                                                                                                                   | Called from                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **get_voting_statistics**          | Return participant count, per-suggestion vote count and percentage, suggester ids/names.                                                                                                                  | results/[id]                          |
| **schedule_group_meals**           | Admin: create one or more (date, slot, suggestion_id) for the session; optionally send as suggestion (insert `scheduled_group_meals` with status `pending`) or commit (e.g. status `scheduled` + notify). | results/[id] (ScheduleGroupMealModal) |
| **get_member_schedule_acceptance** | Return for a session: list of scheduled_group_meals with user_id, status, date, slot, suggestion text. Admin only (or members see only their own rows).                                                   | results/[id] (View group schedule)    |
| **accept_suggested_meal**          | Member: set `scheduled_group_meals.status = 'accepted'` for one row; client then adds event to local calendar.                                                                                            | Calendar inbox / day view             |
| **decline_suggested_meal**         | Member: set `scheduled_group_meals.status = 'declined'`.                                                                                                                                                  | Calendar inbox / day view             |

### 14.1 `get_voting_statistics(p_session_id UUID)`

Returns e.g.:

- `total_participants` (count of distinct voters)
- `suggestions`: array of `{ suggestion_id, suggestion_text, vote_count, percentage, suggested_by_user_id, suggested_by_username }`
- `winner_suggestion_id` (convenience)

### 14.2 `schedule_group_meals(...)`

Inputs:

- `p_session_id UUID`
- `p_schedule_data JSONB`: array of `{ date, slot, suggestion_id }` (and optional `notes`)
- `p_send_as_suggestion BOOLEAN`: if true, insert into `scheduled_group_meals` with status `pending` for each group member (except admin if desired) and create `group_meal_suggested` notifications; if false, treat as “set as group meal plan” (e.g. status `scheduled`, notify `group_meal_scheduled`).
- `p_notify_members BOOLEAN`: whether to create notifications.

Returns: list of `{ user_id, scheduled_group_meal_id, status }` or success count.

---

## 15. Calendar store (post-vote)

### 15.1 Extend `CalendarEvent` (`types/calendar.ts`)

```ts
// Existing voting fields (keep)
votingSessionId?: string;
voteWinnerId?: string;  // or originalSuggestionId for any voted meal
voteCount?: number;
totalVoters?: number;
suggestedBy?: string;

// Add for post-vote
isVotedMeal?: boolean;           // true when added from results (any suggestion)
originalSuggestionId?: string;   // meal_suggestions.id
isWinner?: boolean;
scheduledByAdmin?: boolean;      // true when from admin “schedule for group”
isSuggestedEvent?: boolean;      // true when from admin suggestion (pending accept/decline)
scheduledGroupMealId?: string;   // scheduled_group_meals.id when from suggestion flow
```

- **Member “Add to My Calendar”**: set `isVotedMeal`, `votingSessionId`, `originalSuggestionId`, `isWinner` (and optionally voteCount/totalVoters/suggestedBy).
- **Admin “Schedule for Group” as suggestion**: backend creates `scheduled_group_meals`; client sync or notification leads to member seeing a “suggested” item; on **accept**, client adds event with `scheduledByAdmin`, `isSuggestedEvent`, `scheduledGroupMealId`.
- **Admin “Set as group meal plan”**: same as current “Schedule meal” behaviour (session + local add) with optional `scheduledByAdmin` for audit.

### 15.2 New store methods (`store/calendar-store.ts`)

- **addVotedMeal(event, votingMetadata)** – Wrapper that calls `addEvent` with voting metadata (avoids duplication of field mapping).
- **getVotedMeals(sessionId)** – Return events where `votingSessionId === sessionId`.
- **acceptSuggestedEvent(eventId)** – For events with `scheduledGroupMealId`: call RPC `accept_suggested_meal(scheduledGroupMealId)` then ensure event is in store (or already added).
- **declineSuggestedEvent(eventId)** – Call RPC `decline_suggested_meal`; remove or mark event as declined (if we store suggested-but-not-added items in a separate list, remove from there).

Suggested events that are not yet on the calendar can be stored in a separate slice (e.g. `suggestedMeals: Array<SuggestedMeal>`) and merged in UI with calendar events until accepted/declined.

---

## 16. UI components (post-vote)

| Component                                  | Responsibility                                                                                                                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VotingResultsStats**                     | Shows total participants, bar or list of suggestions with vote count and %, suggester name; highlights winner.                                                                                                        |
| **AddToMyCalendarButton** (per suggestion) | Opens date/slot picker; on confirm calls `addVotedMeal` with metadata for that suggestion.                                                                                                                            |
| **ScheduleGroupMealModal**                 | Admin: date picker (single or multiple dates), meal slot, choice of suggestion(s) (default winner); “Send as suggestion” vs “Set as group meal plan”; optional “Notify members”; submit calls `schedule_group_meals`. |
| **MemberCalendarSuggestions** (Phase 2)    | Inbox-style list of `scheduled_group_meals` with status `pending` for current user; Accept / Decline (and optional Reschedule); on Accept, add to calendar and call `accept_suggested_meal`.                          |
| **VotedMealBadge** (calendar)              | Reuse or extend current “From group vote” badge; show vote count and winner status; tap → navigate to `results/[sessionId]`.                                                                                          |

---

## 17. Implementation phases (post-vote)

### Phase 1 – Core post-vote (results + personal calendar)

1. **get_voting_statistics** RPC and migration (if needed).
2. **Results page**:
   - Statistics section using `get_voting_statistics` (and existing session/suggestions).
   - For **each** suggestion: “Add to My Calendar” → date/slot picker → `addVotedMeal` (or `addEvent` with `isVotedMeal`, `originalSuggestionId`, `isWinner`).
3. **Calendar types**: add `isVotedMeal`, `originalSuggestionId`, `isWinner`.
4. **Calendar store**: `addVotedMeal` helper; optional `getVotedMeals(sessionId)`.
5. **VotedMealBadge**: ensure calendar day view shows “From group vote” and vote info for any event with `votingSessionId` / `isVotedMeal`.

### Phase 2 – Admin group scheduling + suggestions

1. **Migration**: `scheduled_group_meals` table; extend `voting_sessions` with `results_published`, `schedule_published_at`.
2. **RPCs**: `schedule_group_meals`, `get_member_schedule_acceptance`, `accept_suggested_meal`, `decline_suggested_meal`.
3. **ScheduleGroupMealModal**: dates + slots + “Send as suggestion” / “Set as group meal plan” + notify.
4. **Notifications**: `group_meal_suggested`, `group_meal_scheduled` (and optional `meal_acceptance_required`).
5. **Member flow**: list of suggested meals (from `scheduled_group_meals` where `user_id = me` and `status = 'pending'`); Accept adds to calendar and calls `accept_suggested_meal`; Decline calls `decline_suggested_meal`.
6. **Calendar store**: `isSuggestedEvent`, `scheduledGroupMealId`, `acceptSuggestedEvent`, `declineSuggestedEvent`; optional `suggestedMeals` slice.
7. **“View group schedule”**: admin screen that calls `get_member_schedule_acceptance` and shows who accepted/declined.

### Phase 3 – Advanced (optional)

- Conflict detection (meal already scheduled that day/slot).
- Member availability.
- Recurring voted meal patterns.
- Drag-and-drop rescheduling of group schedule.

---

## 18. Security and permissions

- **Results**: Visible to all group members (existing RLS / `get_session_detail`).
- **get_voting_statistics**: Only group members.
- **schedule_group_meals**: Only group admins.
- **get_member_schedule_acceptance**: Admin sees all members; members see only their own rows.
- **accept_suggested_meal** / **decline_suggested_meal**: Only the `user_id` of that row.
- **Calendar**: Client-side; only the owner can add/accept/decline on their device; backend only stores `scheduled_group_meals` and notifications.

---

## 19. Success criteria (post-vote)

- Within 1 minute of deadline, members can open results and see full statistics (participants, per-suggestion votes and %, suggester).
- Any member can add **any** suggestion from the results list to their personal calendar with one tap + date/slot.
- Admin can “Schedule for Group” with one or more (date, slot), and choose “Send as suggestion” or “Set as group meal plan”.
- When sent as suggestion, members see pending suggestions and can Accept (adds to calendar) or Decline.
- Calendar events from votes show “From group vote” and link back to results; admin-suggested events are clearly distinguishable and support accept/decline.
- All flows stay consistent with existing `voting_sessions`, `meal_suggestions`, `profiles`, and calendar store.

---

## 20. Prompt summary for Cursor AI (post-vote)

Use this as a compact prompt when implementing the post-voting phase:

- **Results page** (`app/social/results/[id].tsx`):
  - For **all members**: show voting statistics (total participants, vote count and % per suggestion, who suggested); list all suggestions with an **“Add to My Calendar”** button each (date/slot picker → add to personal calendar with `votingSessionId`, `originalSuggestionId`, `isVotedMeal`, `isWinner`).
  - For **admin only**: add **“Schedule for Group”** that opens a modal to pick dates and meal slot(s), choose winner (or suggestions), and either **“Send as suggestion to all members”** (they can accept/decline) or **“Set as group meal plan”** (commit for group).
- **Database**: Add table `scheduled_group_meals` (voting_session_id, suggestion_id, scheduled_date, meal_slot, status, user_id, created_by_admin_id); extend `voting_sessions` with `results_published`, `schedule_published_at`.
- **RPCs**: `get_voting_statistics(session_id)`, `schedule_group_meals(session_id, schedule_data, send_as_suggestion, notify_members)`, `get_member_schedule_acceptance(session_id)`, `accept_suggested_meal(scheduled_group_meal_id)`, `decline_suggested_meal(scheduled_group_meal_id)`.
- **Calendar**: Extend `CalendarEvent` with `isVotedMeal`, `originalSuggestionId`, `isWinner`, `scheduledByAdmin`, `isSuggestedEvent`, `scheduledGroupMealId`; add `addVotedMeal`, `getVotedMeals`, `acceptSuggestedEvent`, `declineSuggestedEvent`; show “From group vote” badge and link to results.
- **Notifications**: `group_meal_suggested`, `group_meal_scheduled` (and optional `meal_acceptance_required`) when admin schedules or sends suggestions.
- **Phasing**: Implement Phase 1 (stats + per-suggestion “Add to My Calendar”) first; then Phase 2 (admin schedule for group, suggested events, accept/decline).
- **Consistency**: Use `profiles` (not `users`), existing `get_session_detail` and session/suggestion types; keep current calendar store persistence (e.g. AsyncStorage) and existing “From group vote” behaviour.
