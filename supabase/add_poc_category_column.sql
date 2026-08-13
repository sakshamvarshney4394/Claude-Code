-- Add a nullable `poc_category` column to `samples` for the "POC Category"
-- (Client Type) dropdown on the create form.
-- WHY: the Point of Contact section now has a POC Category field with a fixed
--   set of values (HORECA, QSR, Distributors, Exporters). The column is nullable
--   with no default so existing rows keep working and the field is optional.
--   `IF NOT EXISTS` makes it safe to re-run.
--
-- Run this in Supabase Dashboard -> SQL Editor against project zjorbirihnswldxmpyvt.

ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS poc_category TEXT;

-- Verify (optional):
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'samples' AND column_name = 'poc_category';
