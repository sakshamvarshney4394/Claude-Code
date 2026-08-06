-- RLS policies — Sample Tracker App
-- App has NO auth yet (deferred to v2), so it authenticates via the anon key.
-- The anon role must be able to read/write all tables through the Supabase API.

-- 1) Make sure RLS is enabled (idempotent).
ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits   ENABLE ROW LEVEL SECURITY;

-- 2) Grant the anon role full access on each table.
-- FOR ALL = SELECT + INSERT + UPDATE + DELETE. USING(true) applies to existing rows,
-- WITH CHECK(true) applies to new/updated rows. Both default to PUBLIC role.
DROP POLICY IF EXISTS "anon_full_users" ON public.users;
CREATE POLICY "anon_full_users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_full_products" ON public.products;
CREATE POLICY "anon_full_products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_full_samples" ON public.samples;
CREATE POLICY "anon_full_samples" ON public.samples FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_full_visits" ON public.visits;
CREATE POLICY "anon_full_visits" ON public.visits FOR ALL USING (true) WITH CHECK (true);
