# Spoonacular → Supabase: Recipes and Ingredient Images

## Can we make one call and save everything to Supabase?

**Short answer:** You can get all the data you need from Spoonacular in **one or a few API calls**. Saving into Supabase is a **separate step** (your backend or a script), but it can be done right after the Spoonacular response.

Spoonacular does not write to your database. The flow is:

1. **Call Spoonacular** (one or few requests).
2. **Transform** the response to match your schema.
3. **Insert/upsert** into Supabase (and optionally upload images to Supabase Storage).

---

## One-call options in Spoonacular

### Option A: One recipe at a time

- **Get Recipe Information**  
  `GET https://api.spoonacular.com/recipes/{id}/information`

**Single request returns:**

- **Recipe:** `id`, `title`, `image` (full URL), `servings`, `readyInMinutes`, `instructions`, `extendedIngredients`, etc.
- **Recipe image:** Full URL, e.g. `https://img.spoonacular.com/recipes/716429-556x370.jpg`
- **Ingredients:** `extendedIngredients[]` with per-ingredient:
  - `id`, `name`, `original`, `amount`, `unit`
  - `image`: filename only (e.g. `"butter-sliced.jpg"`)
  - Full ingredient image URL: `https://img.spoonacular.com/ingredients_100x100/{image}`

So **one call per recipe** gives you that recipe plus all its ingredients and image URLs (recipe = full URL, ingredients = base URL + filename).

### Option B: Many recipes in one call (best for bulk)

- **Get Recipe Information Bulk**  
  `GET https://api.spoonacular.com/recipes/informationBulk?ids=715538,716429,...`

- Same payload as “Get Recipe Information” but for **multiple recipe IDs** in a single request.
- **Quota:** 1 point for the first recipe, 0.5 per additional recipe.
- Use this to fetch many recipes (and their ingredients + image info) in **one API call**, then save all of them to Supabase in your script/backend.

---

## Saving into Supabase

### What you have today

- **`gallery_meals`:** title, description, base_id, protein_id, vegetable_id, cooking_method, base_group, **image_urls** (TEXT[]).
- **`food_items`:** referenced by base_id, protein_id, vegetable_id (no Spoonacular-specific columns yet).

### Possible approaches

1. **Store Spoonacular URLs only (simplest)**  
   - Map each Spoonacular recipe to a row in `gallery_meals` (or a new `recipes` table if you add one).
   - Put the recipe image in `image_urls` (or a single `image_url` if you add it).
   - For ingredients, either:
     - Store the ingredient list as JSON on the recipe row, or
     - Add an `ingredient_image_url` (or similar) to `food_items` and fill it from Spoonacular’s `extendedIngredients` using `https://img.spoonacular.com/ingredients_100x100/{image}`.
   - No file uploads; you only persist URLs. One Spoonacular bulk call + one (or a few) Supabase insert/upsert operations.

2. **Copy assets into Supabase Storage**  
   - Use the same Spoonacular responses as above.
   - Your script downloads each recipe image and each ingredient image (from the 100x100 URL).
   - Uploads them to Supabase Storage (e.g. `recipe-images/`, `ingredient-images/`).
   - Saves the **Supabase Storage URLs** in your tables instead of Spoonacular URLs.
   - Still **one (or few) Spoonacular calls**; the extra work is download + upload per image.

---

## Reusability after canceling Spoonacular

If you cancel your Spoonacular subscription later, only the approach where you **own the assets** keeps working.

| Approach | After you cancel Spoonacular |
|----------|------------------------------|
| **Store Spoonacular URLs only** | **Not reliably reusable.** Your DB points at `img.spoonacular.com` (or similar). Once you’re no longer a subscriber, Spoonacular may stop serving those image URLs (or require a valid API key). Recipe and ingredient images can break. |
| **Copy assets into Supabase Storage** | **Reusable.** Images are stored in your Supabase bucket; your app uses your own URLs. No ongoing dependency on Spoonacular for serving. Recipe text and ingredient data in your DB also stay valid. |

**Recommendation:** If you plan to cancel Spoonacular after seeding data, use **copy assets into Supabase Storage**. Run the script once while you have an active subscription: call Spoonacular → download recipe and ingredient images → upload to Supabase Storage → save Supabase URLs (and recipe/ingredient metadata) in your DB. After that, the app no longer depends on Spoonacular for images or for serving.

---

## Summary

| Question | Answer |
|----------|--------|
| One Spoonacular call for recipes + ingredients? | Yes. Use **Get Recipe Information** (one recipe) or **Get Recipe Information Bulk** (many recipes). Each recipe includes `extendedIngredients` and image info. |
| One call that also writes to Supabase? | No. Spoonacular only returns data. You call Spoonacular once (or a few times), then in the same script/backend you write to Supabase. |
| Recipe images | Provided as full URLs; can be stored as-is in DB or downloaded and re-hosted in Supabase Storage. |
| Ingredient images | Filename in `extendedIngredients[].image`; full URL is `https://img.spoonacular.com/ingredients_100x100/{image}`. Same choice: store URL or download and store in Supabase Storage. |

So: **one (bulk) Spoonacular call can give you all recipes and ingredient image data; then you run your own logic to save that into Supabase (and optionally into Storage).**

---

## Matching our 360 gallery meals and saving full recipe data

A script matches each **gallery_meal** to a Spoonacular recipe and saves **everything needed for recipes and grocery lists**:

- **Recipe details:** instructions (directions), portion sizes (servings), ready time, meal/recipe photo (in `recipe-images` bucket), stored in **spoonacular_recipe_details**.
- **Ingredients with measurements:** name, amount, unit per recipe for display and **grocery list**, stored in **recipe_ingredients**.
- **Ingredient photos:** downloaded to `ingredient-images` bucket and **ingredient_assets** (for minigames).
- **Link:** `gallery_meals.spoonacular_recipe_id` so every meal has an associated recipe when possible.

The script tries to **ensure each meal gets a recipe**: ingredients-first match, then search by full title, then retry with a shorter title (first 3 words) and more results.

### Match by ingredients vs by name

- **Ingredients-first (default):** Uses `base_id`, `protein_id`, `vegetable_id` → `food_items.name` (e.g. rice, chicken, tomatoes). Calls Spoonacular **findByIngredients**, then falls back to **search by meal title** if no result.
- **Name only:** Set `MATCH=name` to match only by meal title.

### Flow

1. **Fetch** `gallery_meals` and `food_items`; for each meal, match to a Spoonacular recipe (findByIngredients → search by title → retry with shorter title).
2. **Bulk fetch** recipe info; for each recipe save **spoonacular_recipe_details** (instructions, servings, ready_in_minutes, image_url), **recipe_ingredients** (name, amount, unit), download recipe photo to `recipe-images`, ingredient photos to `ingredient-images` and **ingredient_assets**.
3. **Update** `gallery_meals.spoonacular_recipe_id` for each match.

### Grocery list for “meals I want”

For the meals a user wants to make, the app can build a **grocery list** by:

1. Getting the user’s saved meal IDs (e.g. from “Meals I want” / saved_meals).
2. Resolving each to `gallery_meals.id` and reading `spoonacular_recipe_id`.
3. Loading **recipe_ingredients** for those recipe IDs (name, amount, unit).
4. Aggregating (e.g. group by ingredient name, sum amounts) and showing a single list the user can take to the store.

### Run the script

- **Requirements:** `EXPO_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SPOONACULAR_API_KEY` in `.env`.
- **Command:** `npm run spoonacular-match-and-save` (or `node -r dotenv/config scripts/spoonacular-match-and-save.mjs`).
- **Optional:** `LIMIT=50` to process only the first 50 meals.
- **Optional:** `MATCH=name` to match by meal title only.

After running, the app can show full recipe (instructions, portions, ingredients with amounts), recipe and ingredient images from our Storage, and a grocery list for the meals the user wants to create.
