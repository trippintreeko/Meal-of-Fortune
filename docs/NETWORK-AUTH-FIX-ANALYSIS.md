# Network / Auth Error Fix – Comparison and Revert

## Issue summary

After the Round 3 cooking-methods and results-screen changes, the app showed:

- **AuthRetryableFetchError** (Supabase Auth)
- **TypeError: Network request failed** (fetch)
- Widespread Supabase request failures

Comparison was done against the backup:  
`project_before_scraping_meal_generation_for_food_gallery_sorting_games`.

---

## File-by-file comparison

### 1. `lib/supabase.ts`

| Aspect              | Backup (working)                                                     | Current (before fix)                            |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| URL/Key source      | Same: `Constants.expoConfig?.extra` then `process.env.EXPO_PUBLIC_*` | Same                                            |
| `createClient` args | `supabaseUrl`, `supabaseAnonKey`                                     | Same                                            |
| `autoRefreshToken`  | **`true`**                                                           | **`isSupabaseConfigured()`** (could be `false`) |
| Extra export        | None                                                                 | `isSupabaseConfigured()`                        |

**Conclusion:** The only behavioral change was `autoRefreshToken: isSupabaseConfigured()`.  
If the URL was missing or not `https` (e.g. not loaded yet or misconfigured), this turned off token refresh. Auth would still run (e.g. `getSession()`), but with no retries. The client still used the same URL for all requests, so this alone does not explain “all requests failing.” It could, however, change how often Auth hits the network and how errors surface. Reverting to `autoRefreshToken: true` restores the previous Auth behavior.

### 2. `app/_layout.tsx`

| Aspect | Backup | Current (before fix)                                                       |
| ------ | ------ | -------------------------------------------------------------------------- |
| LogBox | None   | `LogBox.ignoreLogs(['Network request failed', 'AuthRetryableFetchError'])` |
| Rest   | Same   | Same                                                                       |

**Conclusion:** LogBox only hid the same errors in the UI; it did not cause them. Reverting removes the suppression so any real network/auth issues are visible again.

### 3. `app.config.js`

**Conclusion:** Identical in backup and current. No env or Supabase config change here.

### 4. `app/game/results.tsx`

- **Backup:** Uses **meal generation** flow: fetches `food_items` only (bases, proteins, vegetables, seasonings, garnishes), builds combinations in memory, no `gallery_meals`.
- **Current:** Uses **gallery filtering** flow: fetches **`gallery_meals`** then **`food_items`** for names; more and different Supabase calls.

So the results screen now triggers more Supabase requests (including `gallery_meals`). If the device cannot reach Supabase (e.g. Android with wrong URL or no internet), both the old and new flows would fail; the new flow fails in more places (more visible “widespread” errors). The **root cause** of “network request failed” is still the device not reaching the Supabase URL, not the results logic itself.

---

## Root cause (what actually changed)

1. **Supabase client**

   - **Change:** `autoRefreshToken` was made conditional on `isSupabaseConfigured()`.
   - **Impact:** When URL is empty or not `https`, token refresh is disabled. This can change Auth retry behavior and error timing; it does not change the URL used for requests. Reverting to `autoRefreshToken: true` matches the backup and is the only client change that could affect Auth.

2. **Layout**

   - **Change:** `LogBox.ignoreLogs` for network/auth errors.
   - **Impact:** Cosmetic only (fewer red boxes); no effect on why requests fail.

3. **Results screen**
   - **Change:** New flow that calls `gallery_meals` and then `food_items`.
   - **Impact:** More Supabase calls and different failure points. If the backup “worked,” it may have been used in an environment where the same Supabase URL was reachable (e.g. web or different network). On an environment where the URL is unreachable (e.g. Android with bad URL), both versions would eventually fail; the new version fails in more places.

So the **code changes that were reverted** are the Supabase client and layout. The **underlying fix for “widespread” failures** is ensuring the device can reach Supabase (correct `EXPO_PUBLIC_SUPABASE_URL` and network), not the results screen logic.

---

## Fix implemented

1. **`lib/supabase.ts`**

   - Restored backup behavior:
     - Removed `isSupabaseConfigured()` and its export.
     - Set **`autoRefreshToken: true`** again (no conditional).

2. **`app/_layout.tsx`**
   - Removed **`LogBox.ignoreLogs`** and the `LogBox` import so behavior matches the backup.

No other files were modified for this fix. The results screen still uses the new gallery-based flow and its Supabase calls; only the client and layout were reverted.

---

## Verification steps

1. **Env**

   - In project root `.env`:
     - `EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co` (no `localhost` on device).
     - `EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`.

2. **Clean start**

   ```bash
   npx expo start --clear
   ```

   Then load the app on the same device/emulator where you saw errors.

3. **Checks**

   - On Android device/emulator: confirm it has internet and that the Supabase URL is the **cloud** URL.
   - Open the results screen (after playing through or “Skip to sample results”) and confirm whether Supabase requests succeed or you still see “Network request failed” / Auth errors.

4. **If errors remain**
   - The problem is environment (URL unreachable, CORS, or SSL), not the reverted code.
   - Verify in the Supabase dashboard that the project URL and anon key match `.env`.
   - Try the same build on web or another network to see if the issue is device/network-specific.

---

## Summary

- **Reverted:** `lib/supabase.ts` (client) and `app/_layout.tsx` (LogBox) to match the backup.
- **Cause of “widespread” failures:** Supabase client/auth behavior change plus more Supabase usage on the results screen; actual failures are due to the device not reaching the Supabase URL.
- **Next step if it’s still broken:** Fix `.env` and network (use cloud Supabase URL, ensure device can reach it); the code revert only restores the same Supabase/Auth behavior as the working backup.
