# Claude Code Prompt — Fix Sample Tracker App

Copy everything below into Claude Code.

---

I have a Next.js + Supabase sample tracking app that's in a broken, inconsistent state after initial scaffolding. Read `STATUS.md` in the project root first for full context — it documents exactly what's built, what's missing, and every known bug. Then fix the issues below **in this exact order**, because later steps depend on earlier ones being correct.

**Ground rule for this whole session:** Before writing any code for a step, give me a short plain-English explanation of what you're about to do and why, and add comments at every table/relationship touchpoint in the code. After each step, give me a 2-3 sentence summary of what changed before moving to the next step. I need to be able to explain every decision to a non-technical stakeholder later, so don't just fix things silently.

---

## Step 1 — Verify the Supabase project and apply the schema

1. Read `.env.local` and confirm which Supabase project it points to.
2. Tell me what you find — don't assume. If `products`, `users`, `samples`, `visits` tables don't exist yet, that confirms schema was never applied.
3. Apply `supabase/schema.sql` to this project (walk me through running it via the Supabase SQL Editor if you can't run it directly — tell me exactly what to paste and where).
4. Confirm all 4 tables now exist with the right columns.

**Do not attempt to "recover" yesterday's samples.** Treat that data as lost — the evidence (empty tables, the crash log in `samples.txt`) says it was never persisted. Skip straight to making the app work going forward.

## Step 2 — Fix the product_id data model (string vs UUID mismatch)

Decision made: products will be a **real normalized table**, not free-text strings.

1. Seed the `products` table from `lib/catalog.ts` — every product across all 14 categories becomes a row with a real UUID `product_id`, `product_name`, and `category`.
2. Update the create-sample form so the product dropdown submits the actual `product_id` UUID (not the product name string).
3. Fix the broken join in `/samples` list and `/samples/[sample_id]` detail pages so `product:products(*)` actually resolves.
4. Explain to me in plain English why this join was failing before, and confirm it resolves now with a real seeded row.

## Step 3 — Fix the homepage stub

`app/page.tsx` currently just renders text claiming to redirect but doesn't. Either:
- make it a real redirect to `/samples`, or
- build a minimal real homepage (your call, tell me which you picked and why).

## Step 4 — Clean up structural cruft

1. Delete the duplicate `src/app/` directory (leftover create-next-app scaffold) — confirm it's not referenced anywhere before deleting.
2. Delete `samples.txt` and `homepage.txt` (junk HTML snapshots, not data).
3. Decide and standardize: pages should call the API routes under `app/api/*` consistently, NOT call Supabase directly from page components. Refactor `/samples`, `/samples/create`, and `/samples/[sample_id]` to go through the API routes. Tell me why this is the better pattern before you do it (centralized error handling, one place to add auth checks later in v2).

## Step 5 — Sales rep field (temporary, pre-auth)

Auth is deferred to v2, but the create-sample form currently doesn't capture a sales rep at all. Add a simple dropdown of rep names (seeded manually or from the `users` table) so samples aren't orphaned of ownership. Note in a comment that this gets replaced by session-based attribution once auth ships.

## Step 6 — Verify end-to-end

Once steps 1-5 are done, walk through and confirm, reporting results to me:
1. Create a sample via the form — confirm it writes correctly with a real `product_id` UUID and a sales rep.
2. View it in the samples list — confirm product name, rep name, and status badge display correctly (proves the join works).
3. Open the detail page, update the status, add a follow-up visit — confirm both persist and the visit count increments.
4. Confirm the homepage now behaves correctly.

## Step 7 — Update STATUS.md

Rewrite `STATUS.md` to reflect the new, fixed state — remove resolved problems from section 5, update section 3/4 to match reality, and note the product_id decision as a resolved architectural choice (not an open question) for future reference.

---

Do not add any v2 features (auth, dashboards, reminders, order value tracking) — stay scoped to fixing what's broken above. Stop and ask me before making any decision I haven't already specified.
