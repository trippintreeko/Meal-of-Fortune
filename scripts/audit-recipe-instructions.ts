/**
 * Lists spoonacular_recipe_details rows where fixed instruction parsing differs
 * from the legacy parser (dropped digits on 3+ digit temps like "420.").
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env
 *
 *   npx tsx --tsconfig tsconfig.json scripts/audit-recipe-instructions.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

import { instructionsToSteps } from '../lib/recipes/instructions'
import {
  instructionsToStepsLegacyAudit,
  stepsDifferFromLegacy
} from '../lib/recipes/instructions-legacy-audit'

loadEnv({ path: resolve(process.cwd(), '.env') })

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()

async function main (): Promise<void> {
  if (!url || !key) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('spoonacular_recipe_details')
    .select('spoonacular_recipe_id, title, instructions')
    .not('instructions', 'is', null)

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const rows = (data ?? []) as Array<{
    spoonacular_recipe_id: number
    title: string | null
    instructions: string
  }>

  const changed: typeof rows = []
  for (const row of rows) {
    if (!row.instructions?.trim()) continue
    if (stepsDifferFromLegacy(row.instructions)) changed.push(row)
  }

  console.log(
    `Total with instructions: ${rows.length}. Parsing differs from legacy: ${changed.length}\n`
  )

  for (const row of changed) {
    const legacy = instructionsToStepsLegacyAudit(row.instructions)
    const fixed = instructionsToSteps(row.instructions)
    console.log('---')
    console.log(`id=${row.spoonacular_recipe_id}  ${row.title ?? '(no title)'}`)
    for (let i = 0; i < Math.max(legacy.length, fixed.length); i++) {
      if (legacy[i] !== fixed[i]) {
        console.log(`  step ${i + 1} legacy: ${legacy[i] ?? '(missing)'}`)
        console.log(`  step ${i + 1} fixed:  ${fixed[i] ?? '(missing)'}`)
      }
    }
  }
}

void main()
