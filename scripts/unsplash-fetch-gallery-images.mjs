/**
 * Pre-fetch 3 Unsplash images per gallery_meals row and store URLs in Supabase.
 * Run once (or when you add new meals) to populate image_urls.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, UNSPLASH_ACCESS_KEY
 * Optional: .env with EXPO_PUBLIC_SUPABASE_URL and the keys above.
 *
 * Usage: node -r dotenv/config scripts/unsplash-fetch-gallery-images.mjs
 *
 * Respects Unsplash rate limits by throttling (default 1 request per second).
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY?.trim() || process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY?.trim()

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}
if (!UNSPLASH_ACCESS_KEY) {
  console.error('Missing UNSPLASH_ACCESS_KEY or EXPO_PUBLIC_UNSPLASH_ACCESS_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const UNSPLASH_HEADERS = { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` }
const THROTTLE_MS = 1100

function sleep (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchUnsplashImages (query, perPage = 3) {
  const encoded = encodeURIComponent(`${query} food`)
  const url = `https://api.unsplash.com/search/photos?query=${encoded}&per_page=${perPage}`
  const res = await fetch(url, { headers: UNSPLASH_HEADERS })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Unsplash ${res.status}: ${text}`)
  }
  const data = await res.json()
  const results = data.results || []
  return results.slice(0, perPage).map((r) => r.urls?.regular || r.urls?.small).filter(Boolean)
}

async function main () {
  console.log('Fetching gallery_meals (id, title)...')
  const { data: rows, error: fetchError } = await supabase
    .from('gallery_meals')
    .select('id, title')
    .order('sort_order', { ascending: true })

  if (fetchError) {
    console.error('Supabase fetch error:', fetchError.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('No gallery meals found.')
    return
  }

  console.log(`Found ${rows.length} meals. Fetching 3 Unsplash images per meal (throttle ${THROTTLE_MS}ms)...`)
  let updated = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const { id, title } = rows[i]
    const safeTitle = (title || '').trim() || 'meal'
    try {
      const urls = await fetchUnsplashImages(safeTitle, 3)
      if (urls.length === 0) {
        console.warn(`  [${i + 1}/${rows.length}] "${safeTitle}" – no images`)
        failed++
        await sleep(THROTTLE_MS)
        continue
      }
      const { error: updateError } = await supabase
        .from('gallery_meals')
        .update({ image_urls: urls })
        .eq('id', id)
      if (updateError) {
        console.warn(`  [${i + 1}/${rows.length}] "${safeTitle}" – update failed:`, updateError.message)
        failed++
      } else {
        updated++
        if ((i + 1) % 20 === 0) console.log(`  Progress: ${i + 1}/${rows.length}`)
      }
    } catch (err) {
      console.warn(`  [${i + 1}/${rows.length}] "${safeTitle}" –`, err.message)
      failed++
    }
    await sleep(THROTTLE_MS)
  }

  console.log(`Done. Updated: ${updated}, failed/skipped: ${failed}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
