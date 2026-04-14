/**
 * Download every row from public.ingredient_assets (image_url → local files) for offline
 * batch work (e.g. background removal). Writes manifest + export metadata for re-upload.
 *
 * Each row includes storage_bucket + storage_path so files map 1:1 to the
 * ingredient-images bucket (same paths as spoonacular-match-and-save.mjs).
 * Row UUID (id) is included for debugging; re-upload keys on spoonacular_ingredient_id.
 *
 * After editing images: run `npm run upload-ingredient-assets` (service role) to push
 * back. If you change extension (e.g. .jpg → .png), the upload script finds `{id}.png`
 * and updates DB image_url automatically.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and a key with SELECT on ingredient_assets
 *           (anon works — table has public read in migrations).
 *
 * Usage:
 *   node -r dotenv/config scripts/download-ingredient-assets.mjs
 *
 * Optional env:
 *   OUT_DIR=./exports/ingredient-assets   (default)
 *   PAGE_SIZE=1000                        (rows per Supabase request)
 *   CONCURRENCY=6                         (parallel downloads)
 *   SKIP_EXISTING=1                       (skip file if already on disk)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(__dirname, '..')

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim()

const OUT_DIR = path.resolve(
  REPO_ROOT,
  (process.env.OUT_DIR || './exports/ingredient-assets').trim()
)
const PAGE_SIZE = Math.min(5000, Math.max(100, parseInt(process.env.PAGE_SIZE || '1000', 10)))
const CONCURRENCY = Math.min(32, Math.max(1, parseInt(process.env.CONCURRENCY || '6', 10)))
const SKIP_EXISTING = process.env.SKIP_EXISTING === '1' || process.env.SKIP_EXISTING === 'true'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing EXPO_PUBLIC_SUPABASE_URL and a key (EXPO_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY).'
  )
  process.exit(1)
}

const STORAGE_BUCKET = 'ingredient-images'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function extFromUrl (urlString) {
  try {
    const u = new URL(urlString)
    const base = path.basename(u.pathname)
    const dot = base.lastIndexOf('.')
    if (dot > 0 && dot < base.length - 1) {
      const ext = base.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '')
      if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext === 'jpeg' ? 'jpg' : ext
    }
  } catch {
    /* ignore */
  }
  return 'jpg'
}

async function fetchAllRows () {
  const rows = []
  let from = 0
  for (;;) {
    const { data, error } = await supabase
      .from('ingredient_assets')
      .select('id, spoonacular_ingredient_id, name, image_url')
      .order('spoonacular_ingredient_id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`ingredient_assets select: ${error.message}`)
    }
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

async function downloadOne (row, imagesDir) {
  const id = row.spoonacular_ingredient_id
  const url = (row.image_url || '').trim()
  if (id == null || !url) {
    return { id, ok: false, error: 'missing id or url' }
  }
  const ext = extFromUrl(url)
  const filename = `${id}.${ext}`
  const filePath = path.join(imagesDir, filename)

  if (SKIP_EXISTING) {
    try {
      await fs.access(filePath)
      return { id, ok: true, skipped: true, filePath, filename }
    } catch {
      /* download */
    }
  }

  const res = await fetch(url)
  if (!res.ok) {
    return { id, ok: false, error: `HTTP ${res.status}` }
  }
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(filePath, buf)
  return { id, ok: true, filePath, filename, bytes: buf.length }
}

async function poolMap (items, limit, fn) {
  const results = []
  let i = 0
  async function worker () {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx], idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

async function main () {
  console.log('Fetching ingredient_assets rows…')
  const rows = await fetchAllRows()
  console.log(`Found ${rows.length} rows.`)

  await fs.mkdir(OUT_DIR, { recursive: true })
  const imagesDir = path.join(OUT_DIR, 'images')
  await fs.mkdir(imagesDir, { recursive: true })

  console.log(
    `Downloading to ${imagesDir} (concurrency=${CONCURRENCY}, skip_existing=${SKIP_EXISTING})…`
  )

  const results = await poolMap(rows, CONCURRENCY, (row) => downloadOne(row, imagesDir))

  let ok = 0
  let skipped = 0
  let failed = 0
  for (const r of results) {
    if (r?.ok && r.skipped) skipped++
    else if (r?.ok) ok++
    else failed++
  }

  const manifest = rows.map((row, idx) => {
    const r = results[idx]
    const ext = extFromUrl(row.image_url || '')
    const filename = `${row.spoonacular_ingredient_id}.${ext}`
    return {
      row_id: row.id,
      spoonacular_ingredient_id: row.spoonacular_ingredient_id,
      name: row.name,
      image_url: row.image_url,
      storage_bucket: STORAGE_BUCKET,
      storage_path: filename,
      local_filename: filename,
      local_relative: `images/${filename}`,
      download_ok: Boolean(r?.ok),
      skipped: Boolean(r?.skipped),
      error: r?.ok ? null : r?.error || 'unknown'
    }
  })

  const exportMeta = {
    format_version: 1,
    exported_at: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    storage_bucket: STORAGE_BUCKET,
    db_table: 'ingredient_assets',
    db_id_column: 'spoonacular_ingredient_id',
    db_url_column: 'image_url',
    row_uuid_column: 'id',
    notes: [
      'Files under images/ use the same object key as Storage (storage_path).',
      'Re-upload: npm run upload-ingredient-assets (needs SUPABASE_SERVICE_ROLE_KEY).',
      'If you export PNG after edits, name files {spoonacular_ingredient_id}.png — upload script resolves by id.'
    ]
  }

  const manifestPath = path.join(OUT_DIR, 'manifest.json')
  const bundle = { meta: exportMeta, items: manifest }
  await fs.writeFile(manifestPath, JSON.stringify(bundle, null, 2), 'utf8')

  const metaOnlyPath = path.join(OUT_DIR, 'export-meta.json')
  await fs.writeFile(metaOnlyPath, JSON.stringify(exportMeta, null, 2), 'utf8')

  console.log(`Done. ok=${ok} skipped=${skipped} failed=${failed}`)
  console.log(`Manifest (meta + items): ${manifestPath}`)
  console.log(`Export meta: ${metaOnlyPath}`)
  if (failed > 0) {
    console.log('Check manifest entries with download_ok=false for HTTP errors.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
