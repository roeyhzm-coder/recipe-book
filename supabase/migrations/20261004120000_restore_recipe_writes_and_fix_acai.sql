GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

DROP POLICY IF EXISTS "Anyone can read recipes" ON public.recipes;
DROP POLICY IF EXISTS "Anyone can insert recipes" ON public.recipes;
DROP POLICY IF EXISTS "Anyone can update recipes" ON public.recipes;
DROP POLICY IF EXISTS "Anyone can delete recipes" ON public.recipes;

CREATE POLICY "Anyone can read recipes" ON public.recipes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert recipes" ON public.recipes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update recipes" ON public.recipes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete recipes" ON public.recipes FOR DELETE TO anon, authenticated USING (true);

UPDATE public.recipes
SET
  ingredients = COALESCE((
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements(COALESCE(ingredients, '[]'::jsonb)) AS elem
    WHERE COALESCE(elem->>'name', '') NOT ILIKE '%משקה שקדים%'
      AND COALESCE(elem->>'name', '') NOT ILIKE '%alpro%'
  ), '[]'::jsonb),
  steps = COALESCE((
    SELECT jsonb_agg(
      regexp_replace(
        regexp_replace(elem, '\s*ו-?\s*200\s*מ["״]?ל\s*משקה שקדים[^.]*', '', 'gi'),
        'משקה שקדים Alpro[^.]*',
        '',
        'gi'
      )
    )
    FROM jsonb_array_elements_text(COALESCE(steps, '[]'::jsonb)) AS elem
  ), '[]'::jsonb),
  macros = COALESCE(macros, '{}'::jsonb)
    || jsonb_build_object('calories', 477, 'protein', 28.9, 'carbs', 54.2, 'fat', 16.6)
WHERE id = 'breakfast-1' OR title = 'קערת אסאי וחלבון';
