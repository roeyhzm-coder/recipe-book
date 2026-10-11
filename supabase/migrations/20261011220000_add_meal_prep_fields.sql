ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS is_meal_prep boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_portions integer NOT NULL DEFAULT 1;

UPDATE public.recipes
SET is_meal_prep = true
WHERE is_meal_prep = false
  AND (
    categories::text ILIKE '%Meal Prep%'
    OR categories::text ILIKE '%meal prep%'
  );

UPDATE public.recipes
SET total_portions = GREATEST(1, CAST(ROUND(COALESCE(base_servings, 1)) AS integer))
WHERE COALESCE(base_servings, 1) > 1;
