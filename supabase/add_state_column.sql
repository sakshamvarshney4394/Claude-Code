-- Add a nullable `state` column to `samples` for the State dropdown on the create form.
-- WHY: the create form now has a State dropdown (28 states + 8 union territories).
--   The column is nullable with no default so existing rows keep working and the
--   field is optional on the form. `IF NOT EXISTS` makes it safe to re-run.
--
-- Run this in Supabase Dashboard -> SQL Editor against project zjorbirihnswldxmpyvt.

ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS state TEXT;

-- Verify (optional):
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'samples' AND column_name = 'state';