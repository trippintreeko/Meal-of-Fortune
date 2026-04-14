/**
 * Re-upload processed ingredient images to Supabase Storage + refresh ingredient_assets.image_url.
 *
 * Prereq: manifest from `npm run download-ingredient-assets` (paths + ids).
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (storage write + DB update)
 *
 * Typical flow after background removal:
 *
 *   If you put processed files next to the manifest (common layout):
 *     exports/ingredient-assets/manifest.json
 *     exports/ingredient-assets/background_removed/{id}.png
 *   then IMAGES_DIR must include ingredient-assets:
 *
 *   # PowerShell
 *   $env:MANIFEST_PATH="exports/ingredient-assets/manifest.json"
 *   $env:IMAGES_DIR="exports/ingredient-assets/background_removed"
 *   npm run upload-ingredient-assets
 *
 *   # Or bash
 *   MANIFEST_PATH=exports/ingredient-assets/manifest.json IMAGES_DIR=exports/ingredient-assets/background_removed npm run upload-ingredient-assets
 *
 *   Alternate: a top-level exports/background_removed (no ingredient-assets in path) also works if that is where files live.
 *
 * If manifest + processed images live in one folder:
 *   INPUT_DIR=./exports/background_removed   (expects manifest.json there and images in IMAGES_DIR or ./images)
 *
 * Optional env:
 *   INPUT_DIR=./exports/ingredient-assets     (default base when MANIFEST_PATH / IMAGES_DIR omitted)
 *   MANIFEST_PATH=.../manifest.json           (override)
 *   IMAGES_DIR=.../background_removed       (folder with {id}.png|jpg|webp; often exports/ingredient-assets/background_removed)
 *   DRY_RUN=1                               (log only, no upload)
 *   VERBOSE_MISSING=1                       (log every missing file; default is summary only)
 *
 * Files must be named exactly: {spoonacular_ingredient_id}.png (or .jpg / .webp).
 * The script also searches: IMAGES_DIR/images, IMAGES_DIR/output (common export layouts).
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(__dirname, '..')

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

const INPUT_DIR = path.resolve(
  REPO_ROOT,
  (process.env.INPUT_DIR || './exports/ingredient-assets').trim()
)

const manifestPath = process.env.MANIFEST_PATH?.trim()
  ? path.resolve(REPO_ROOT, process.env.MANIFEST_PATH.trim())
  : path.join(INPUT_DIR, 'manifest.json')

const imagesDir = process.env.IMAGES_DIR?.trim()
  ? path.resolve(REPO_ROOT, process.env.IMAGES_DIR.trim())
  : path.join(INPUT_DIR, 'images')

const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
const VERBOSE_MISSING = process.env.VERBOSE_MISSING === '1' || process.env.VERBOSE_MISSING === 'true'

const BUCKET = 'ingredient-images'
const ALT_EXTS = ['png', 'jpg', 'jpeg', 'webp']

/** Prefer png/webp over jpg when the same id appears twice */
const EXT_RANK = { png: 4, webp: 3, jpg: 2, jpeg: 2, gif: 1 }

const INGREDIENT_FILE_RE = /^(\d+)\.(png|jpe?g|webp|gif)$/i

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Requires EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function contentTypeForExt (ext) {
  const e = ext.toLowerCase()
  if (e === 'png') return 'image/png'
  if (e === 'webp') return 'image/webp'
  if (e === 'jpg' || e === 'jpeg') return 'image/jpeg'
  return 'image/jpeg'
}

async function dirExists (p) {
  try {
    const st = await fs.stat(p)
    return st.isDirectory()
  } catch {
    return false
  }
}

/**
 * Collect roots to scan: top folder + common subfolders from batch tools.
 */
async function collectSearchRoots (base) {
  const candidates = [
    base,
    path.join(base, 'images'),
    path.join(base, 'output'),
    path.join(base, 'exports'),
    path.join(base, 'Results')
  ]
  const roots = []
  for (const c of candidates) {
    if (await dirExists(c)) roots.push(c)
  }
  return roots
}

/**
 * Map ingredient id string -> { abs, storagePath } for files named strictly {id}.{ext}
 */
async function buildIdFileMap (roots) {
  const map = new Map()
  for (const root of roots) {
    let entries
    try {
      entries = await fs.readdir(root, { withFileTypes: true })
    } catch {
      continue
    }
    for (const ent of entries) {
      if (!ent.isFile()) continue
      const m = ent.name.match(INGREDIENT_FILE_RE)
      if (!m) continue
      const idStr = m[1]
      const ext = m[2].toLowerCase()
      const sp = `${idStr}.${ext === 'jpeg' ? 'jpg' : ext}`
      const abs = path.join(root, ent.name)
      const prev = map.get(idStr)
      const rank = EXT_RANK[ext] ?? 0
      const prevRank = prev
        ? EXT_RANK[path.extname(prev.storagePath).slice(1).toLowerCase()] ?? 0
        : -1
      if (!prev || rank > prevRank) {
        map.set(idStr, { abs, storagePath: sp })
      }
    }
  }
  return map
}

async function findLocalFile (idFileMap, imagesDir, id, storagePath) {
  const fromMap = idFileMap.get(String(id))
  if (fromMap) return fromMap

  const preferred = path.join(imagesDir, storagePath)
  try {
    await fs.access(preferred)
    return { abs: preferred, storagePath }
  } catch {
    /* try alternates by id in top dir only */
  }
  for (const ext of ALT_EXTS) {
    const sp = `${id}.${ext}`
    const p = path.join(imagesDir, sp)
    try {
      await fs.access(p)
      return { abs: p, storagePath: sp }
    } catch {
      /* next */
    }
  }
  return null
}

async function main () {
  console.log(`Manifest: ${manifestPath}`)
  console.log(`Images dir (IMAGES_DIR): ${imagesDir}`)

  if (!(await dirExists(imagesDir))) {
    console.error(
      `\nFolder does not exist or is not a directory:\n  ${imagesDir}\n\n` +
        'Fix IMAGES_DIR to the folder that contains your processed images.\n' +
        'Names must be like 9040.png (only digits + extension).'
    )
    process.exit(1)
  }

  const searchRoots = await collectSearchRoots(imagesDir)
  console.log('Searching for files named {id}.png|.jpg|.webp in:')
  for (const r of searchRoots) console.log(`  - ${r}`)

  const idFileMap = await buildIdFileMap(searchRoots)
  const sampleKeys = [...idFileMap.keys()].slice(0, 8)
  console.log(
    `Found ${idFileMap.size} image files matching /^\\d+\\.(png|jpg|webp|...)$/i` +
      (sampleKeys.length ? ` (e.g. ids: ${sampleKeys.join(', ')}…)` : '')
  )

  if (idFileMap.size === 0) {
    console.error(
      '\nNo correctly named files found. The uploader only recognizes:\n' +
        '  9040.png   1001.jpg   11203.webp\n' +
        'Not: 9040_final.png, image_9040.png, or exports without the numeric id as the whole name.\n' +
        'Rename outputs to {spoonacular_ingredient_id}.{ext} or put them in IMAGES_DIR or IMAGES_DIR/images.'
    )
  }

  const raw = await fs.readFile(manifestPath, 'utf8')
  const parsed = JSON.parse(raw)
  const items = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(items)) {
    console.error('manifest.json must be an array or { items: [...] }')
    process.exit(1)
  }

  let uploaded = 0
  let skipped = 0
  let failed = 0
  const missingIds = []

  for (const row of items) {
    const id = row.spoonacular_ingredient_id
    const storagePath = row.storage_path || row.local_filename
    if (id == null || !storagePath) {
      console.warn(`Skip row: missing id or storage_path`, row)
      failed++
      continue
    }

    const found = await findLocalFile(idFileMap, imagesDir, id, storagePath)
    if (!found) {
      if (row.download_ok === false) {
        skipped++
        continue
      }
      missingIds.push(id)
      if (VERBOSE_MISSING) {
        console.warn(`No file for ingredient ${id} (tried ${storagePath} and ${id}.{png,jpg,...})`)
      }
      failed++
      continue
    }

    const ext = path.extname(found.storagePath).slice(1) || 'jpg'
    const contentType = contentTypeForExt(ext)
    const buf = await fs.readFile(found.abs)

    if (DRY_RUN) {
      console.log(`[dry-run] would upload ${found.storagePath} (${buf.length}b) for id ${id}`)
      uploaded++
      continue
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(found.storagePath, buf, { contentType, upsert: true })

    if (upErr) {
      console.error(`Upload ${found.storagePath}: ${upErr.message}`)
      failed++
      continue
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(found.storagePath)
    const publicUrl = urlData?.publicUrl
    if (!publicUrl) {
      console.error(`No public URL for ${found.storagePath}`)
      failed++
      continue
    }

    const { error: dbErr } = await supabase
      .from('ingredient_assets')
      .update({ image_url: publicUrl })
      .eq('spoonacular_ingredient_id', id)

    if (dbErr) {
      console.error(`DB update ${id}: ${dbErr.message}`)
      failed++
      continue
    }

    uploaded++
    if (uploaded % 50 === 0) console.log(`  … ${uploaded} uploaded`)
  }

  console.log(
    DRY_RUN
      ? `[dry-run] would process: ok~${uploaded} skipped=${skipped} failed=${failed}`
      : `Done. uploaded+updated=${uploaded} skipped=${skipped} failed=${failed}`
  )

  if (missingIds.length > 0 && !VERBOSE_MISSING) {
    const head = missingIds.slice(0, 15).join(', ')
    console.log(
      `\n${missingIds.length} rows had no local file (set VERBOSE_MISSING=1 for each line). First ids: ${head}${missingIds.length > 15 ? '…' : ''}`
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
