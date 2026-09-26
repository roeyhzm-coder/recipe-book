-- Smart Multi-List Grocery System

CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'רשימה',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  updated_at_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grocery_items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  checked BOOLEAN NOT NULL DEFAULT false,
  source_recipes JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  updated_at_ms BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS grocery_items_list_id_idx ON public.grocery_items (list_id);
CREATE INDEX IF NOT EXISTS grocery_items_checked_idx ON public.grocery_items (list_id, checked);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_lists TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_items TO anon, authenticated;
GRANT ALL ON public.grocery_lists TO service_role;
GRANT ALL ON public.grocery_items TO service_role;

ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read grocery lists" ON public.grocery_lists;
DROP POLICY IF EXISTS "Anyone can insert grocery lists" ON public.grocery_lists;
DROP POLICY IF EXISTS "Anyone can update grocery lists" ON public.grocery_lists;
DROP POLICY IF EXISTS "Anyone can delete grocery lists" ON public.grocery_lists;
DROP POLICY IF EXISTS "Anyone can read grocery items" ON public.grocery_items;
DROP POLICY IF EXISTS "Anyone can insert grocery items" ON public.grocery_items;
DROP POLICY IF EXISTS "Anyone can update grocery items" ON public.grocery_items;
DROP POLICY IF EXISTS "Anyone can delete grocery items" ON public.grocery_items;

CREATE POLICY "Anyone can read grocery lists" ON public.grocery_lists FOR SELECT USING (true);
CREATE POLICY "Anyone can insert grocery lists" ON public.grocery_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update grocery lists" ON public.grocery_lists FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete grocery lists" ON public.grocery_lists FOR DELETE USING (true);

CREATE POLICY "Anyone can read grocery items" ON public.grocery_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert grocery items" ON public.grocery_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update grocery items" ON public.grocery_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete grocery items" ON public.grocery_items FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_grocery_lists_updated_at ON public.grocery_lists;
CREATE TRIGGER update_grocery_lists_updated_at
  BEFORE UPDATE ON public.grocery_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_grocery_items_updated_at ON public.grocery_items;
CREATE TRIGGER update_grocery_items_updated_at
  BEFORE UPDATE ON public.grocery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
