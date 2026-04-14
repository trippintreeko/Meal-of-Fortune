## Recipes

Recipe-related helpers live here (search URLs, Spoonacular matching, etc).

Current helpers:
- `getMealNearMeUrl(mealTitle?)`

### Matching gallery meals to Spoonacular and saving ingredient images

Gallery meals are matched to Spoonacular recipes and ingredient images are saved to Supabase for use in minigames. Use the script:

```bash
npm run spoonacular-match-and-save
```

Requires `SPOONACULAR_API_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. Optional: `LIMIT=50` to process only the first 50 meals. See `docs/SPOONACULAR-SUPABASE-RECIPES.md` for details.

### Duplicate titles and backfilling unmatched

After syncing Spoonacular titles, some gallery meals can share the same title (one recipe matched many meals). To list duplicates and meals with no recipe:

```bash
npm run spoonacular-list-duplicates
```

To re-assign duplicate-title meals and unmatched meals to *different* Spoonacular recipes (by ingredients or cuisine/style), then save details and sync titles:

```bash
npm run spoonacular-dedupe-and-backfill
```

This keeps all 360 rows; it only updates `spoonacular_recipe_id` and title for duplicates and unmatched so each meal gets a distinct recipe where possible.
