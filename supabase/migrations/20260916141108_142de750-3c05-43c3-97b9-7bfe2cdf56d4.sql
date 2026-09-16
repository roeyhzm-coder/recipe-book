GRANT SELECT ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

DROP POLICY IF EXISTS "Anyone can read recipes" ON public.recipes;
CREATE POLICY "Anyone can read recipes" ON public.recipes FOR SELECT TO anon, authenticated USING (true);