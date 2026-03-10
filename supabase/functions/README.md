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

## If Deno is installed but Cursor still can’t find it

Point the extension at the binary in `.vscode/settings.json`:

```json
"deno.path": "C:\\Users\\YourName\\.deno\\bin\\deno.exe"
```

(or the path from `where deno` / `where.exe deno` in a new terminal after installing).
