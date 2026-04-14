-- Add feeling_ids to gallery_meals so "How are you feeling?" vibes can filter gallery meals.
-- feeling_ids = array of feeling option ids from lib/feelings.ts (e.g. 'warm_me_up', 'cool_me_off').

ALTER TABLE public.gallery_meals
  ADD COLUMN IF NOT EXISTS feeling_ids TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.gallery_meals.feeling_ids IS 'Feeling vibe ids from FEELINGS (e.g. warm_me_up, comforting). Used to filter gallery by mood.';

CREATE INDEX IF NOT EXISTS idx_gallery_meals_feeling_ids
  ON public.gallery_meals USING GIN (feeling_ids);
