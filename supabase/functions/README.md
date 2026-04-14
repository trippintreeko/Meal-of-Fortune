# Supabase Edge Functions (Deno)

These run on Supabase’s Deno runtime. For **local editing** in Cursor/VS Code, the Deno extension needs the Deno runtime on your machine.

## Install Deno (fix “Could not resolve Deno executable”)

Pick one:

**PowerShell (Windows):**
```powershell
irm https://deno.land/install.ps1 | iex
```
Then restart Cursor so it picks up the new `PATH`.

**npm (any OS):**
```bash
npm install -g deno
```

**Manual:** [deno.land](https://deno.land) → install instructions for your OS.

## In-app notification crons (after migration `20260329150000_in_app_notifications_triggers.sql`)

Schedule with [Supabase Dashboard → Edge Functions → Cron](https://supabase.com/docs/guides/functions/schedule-functions) or an external ping:

| Function | Suggested schedule | Purpose |
|----------|-------------------|---------|
| `voting-deadline-reminders` | Every 5–10 minutes | In-app “vote closing soon” at ~30 / 60 / 120 minutes before deadline (respects **Deadline reminders** + quiet hours). |
| `weekly-in-app-summary` | Weekly (e.g. `0 9 * * 1` UTC) | In-app weekly summary row for users who enabled **Weekly summary** (max once per 6 days per user). |

Existing **`process-voting-deadline`** continues to close expired votes; it now inserts **Voting results** via `create_in_app_notification_if_allowed` (respects **Voting results** + quiet hours).

## If Deno is installed but Cursor still can’t find it

Point the extension at the binary in `.vscode/settings.json`:

```json
"deno.path": "C:\\Users\\YourName\\.deno\\bin\\deno.exe"
```

(or the path from `where deno` / `where.exe deno` in a new terminal after installing).
