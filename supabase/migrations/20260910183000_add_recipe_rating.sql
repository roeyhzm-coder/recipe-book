ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 1) CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));