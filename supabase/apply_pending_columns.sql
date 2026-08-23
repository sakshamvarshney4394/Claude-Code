-- One-shot migration for the columns added by the create-form / edit sessions
-- that were never applied to the live DB. Both are nullable TEXT with no
-- default (existing rows keep working; the form fields remain optional).
-- `IF NOT EXISTS` makes this safe to re-run.
--
-- Run in Supabase Dashboard -> SQL Editor against project zjorbirihnswldxmpyvt.

ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS state TEXT;

ALTER TABLE public.samples
  ADD COLUMN IF NOT EXISTS poc_category TEXT;

-- After running, if the API still complains for ~30s, force PostgREST to
-- reload its schema cache:
-- NOTIFY pgrst, 'reload schema';
