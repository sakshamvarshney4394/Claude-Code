-- FK constraints for PostgREST joins
-- WHY: supabase/schema.sql created product_id / sales_rep_id / sample_id as plain
-- UUID columns with NO foreign keys ("handled at application level"). But the app's
-- embedded joins in /api/samples (`product:products(*)`, `sales_rep:users(*)`,
-- `visits:visits(*)`) require real FK constraints so Supabase's schema cache can
-- resolve them. Without these, GET /api/samples fails with
--   "Could not find a relationship between 'samples' and 'products'".
--
-- Scope check (v2 note): these are the ONLY FK constraints the current app needs.
-- They do NOT add auth, dashboards, reminders, or order-value tracking.
--
-- Run this in Supabase Dashboard -> SQL Editor against project zjorbirihnswldxmpyvt.

-- Protect if re-run: drop existing constraints first (safe, idempotent re-run).
ALTER TABLE IF EXISTS public.samples DROP CONSTRAINT IF EXISTS fk_samples_product;
ALTER TABLE IF EXISTS public.samples DROP CONSTRAINT IF EXISTS fk_samples_sales_rep;
ALTER TABLE IF EXISTS public.visits  DROP CONSTRAINT IF EXISTS fk_visits_sample;

-- samples.product_id -> products.product_id  (main product join)
ALTER TABLE public.samples
  ADD CONSTRAINT fk_samples_product
  FOREIGN KEY (product_id) REFERENCES public.products(product_id);

-- samples.sales_rep_id -> users.user_id  (sales rep join)
ALTER TABLE public.samples
  ADD CONSTRAINT fk_samples_sales_rep
  FOREIGN KEY (sales_rep_id) REFERENCES public.users(user_id);

-- visits.sample_id -> samples.sample_id  (follow-up visits join)
ALTER TABLE public.visits
  ADD CONSTRAINT fk_visits_sample
  FOREIGN KEY (sample_id) REFERENCES public.samples(sample_id);