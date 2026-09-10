CREATE TABLE public.recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  macros JSONB NOT NULL DEFAULT '{}'::jsonb,
  base_servings NUMERIC NOT NULL DEFAULT 1,
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recipes" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert recipes" ON public.recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update recipes" ON public.recipes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete recipes" ON public.recipes FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();