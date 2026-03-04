/**
 * Cleanup orphan auth users: delete any auth.users row that has no matching
 * public.profiles row (profiles.auth_id = auth.users.id).
 *
 * Run monthly or on demand. Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage: node scripts/cleanup-orphan-auth-users.mjs
 * Or:   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/cleanup-orphan-auth-users.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Set them in .env or pass them when running the script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function main () {
  console.log('Fetching profile auth_ids...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('auth_id')

  if (profilesError) {
    console.error('Failed to fetch profiles:', profilesError.message)
    process.exit(1)
  }

  const profileAuthIds = new Set((profiles || []).map((p) => p.auth_id).filter(Boolean))
  console.log(`Found ${profileAuthIds.size} profile(s) with auth_id.`)

  const orphanIds = []
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('Failed to list auth users:', error.message)
      process.exit(1)
    }
    const users = data?.users ?? []
    if (users.length === 0) break
    for (const user of users) {
      if (!profileAuthIds.has(user.id)) orphanIds.push(user.id)
    }
    if (users.length < perPage) break
    page += 1
  }

  console.log(`Found ${orphanIds.length} orphan auth user(s) (no matching profile).`)
  if (orphanIds.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  let deleted = 0
  let failed = 0
  for (const uid of orphanIds) {
    const { error } = await supabase.auth.admin.deleteUser(uid)
    if (error) {
      console.error(`Failed to delete ${uid}:`, error.message)
      failed += 1
    } else {
      deleted += 1
    }
  }

  console.log(`Done. Deleted: ${deleted}, Failed: ${failed}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
