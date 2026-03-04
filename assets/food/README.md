# Food assets for minigames

Place your game food PNGs here so RiverNet and ConveyorBelt can display them.

**Filenames** must match the keys in `lib/food-asset-mapping.ts` (e.g. `rice.png`, `chicken.png`, `avacado.png`, `noodle_macoronia.png`). See that file for the full list.

**Optional:** You can keep assets in `library/Game_food_assets/food/` and either copy/symlink them here, or change the `require()` paths in `lib/food-asset-registry.ts` to point there.

After adding a file, uncomment the corresponding line in `lib/food-asset-registry.ts` so the app uses your image instead of the placeholder.

---

## Adding new food items or assets later

- **New food item in DB:** Add a row in `DIRECT_FOOD_ID_TO_ASSET` in `lib/food-asset-mapping.ts` mapping the new food `id` to an existing asset key (e.g. new grain → `'rice'`). If you omit it, the item uses the category fallback (base → rice, protein → chicken, vegetable → vegetables).
- **New asset image:** Add the PNG here with the exact key name (e.g. `quinoa.png`). Add the key to `ASSET_KEYS` in `lib/food-asset-mapping.ts`, add a direct mapping for any food ids that should use it, and uncomment/add `key: require('@/assets/food/key.png')` in `lib/food-asset-registry.ts`.
- **Typos in filenames:** The mapping uses keys like `avacado` and `noodle_macoronia` to match your actual filenames; keep those keys in both the mapping and the registry.
