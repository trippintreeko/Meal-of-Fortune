# Voting History Auto-Expiration – Cron Setup

After deploying the edge functions, schedule them so old voting sessions are archived and purged automatically.

## Edge functions

- **`archive-old-votes`** – Calls `archive_old_voting_sessions()`. Marks completed/cancelled sessions older than each group’s retention period as archived.
- **`purge-archived-votes`** – Calls `purge_archived_voting_sessions()`. Permanently deletes sessions that have been archived for more than 30 days.

## Recommended schedule

| Function               | Schedule               | Example (Supabase Dashboard) |
| ---------------------- | ---------------------- | ---------------------------- |
| `archive-old-votes`    | Daily at 2:00 AM UTC   | `0 2 * * *`                  |
| `purge-archived-votes` | Weekly Sun 3:00 AM UTC | `0 3 * * 0`                  |

## Supabase

1. **Dashboard** → **Edge Functions** → select the function → **Cron** (or use **Database** → **Cron** if using `pg_cron`).
2. For HTTP-triggered cron, use Supabase’s cron feature or an external scheduler (e.g. GitHub Actions, cron job) to `POST` to the function’s invoke URL with the service role key in the `Authorization` header.

## Invoke URLs

- Archive: `https://<project-ref>.supabase.co/functions/v1/archive-old-votes`
- Purge: `https://<project-ref>.supabase.co/functions/v1/purge-archived-votes`

Use the same auth as other edge functions (e.g. `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`).
