-- Remove 24 gallery meals and linked Spoonacular recipe rows (empty / unwanted recipes).
-- Does not delete recipe_ingredients (may be reused if another meal shares the same Spoonacular id).

DO $$
DECLARE
  ids int[] := ARRAY[
    984198, 715393, 715742, 679539, 780000, 803366, 982372, 13265,
    868800, 681713, 949421, 715412, 715596, 715748, 716429, 716427,
    716363, 13073, 769775, 685023, 715732, 681708, 715754, 795512
  ];
BEGIN
  DELETE FROM gallery_meals WHERE spoonacular_recipe_id = ANY (ids);
  DELETE FROM spoonacular_recipe_details WHERE spoonacular_recipe_id = ANY (ids);
END $$;

-- Optional: delete recipe image objects from Storage bucket `recipe-images` (filenames like 984198.png)
-- via Dashboard → Storage or CLI; DB rows above no longer reference them.
