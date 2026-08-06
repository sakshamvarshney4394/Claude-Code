# 📋 PROJECT STATUS — Sample Tracker App for Naturin

> **Purpose of this file:** Give any Claude session full context about this app in one read —
> what it is, what's done, what's NOT done, and every known problem. Read this first.
>
> **Date:** 2026-08-06 (updated after the 7-step stabilization pass — see Section 8)

---

## 1. WHAT THIS APP IS

A **Sample Tracking System** for a food/condiments company (Naturin). Sales reps log **product samples** sent to clients (party/company), then track **follow-up visits** and the **outcome/status** of each sample.

**Tech stack (verified):**
- **Next.js 16.3.0** (App Router, Turbopack dev) + **React 19.2.8**
- **TypeScript** + **Tailwind CSS v4**
- **Supabase** (`@supabase/supabase-js`) as the database/backend (client-side, anon key)
- Tests tooling installed (Jest 30 / ts-jest) but **no tests written yet**

**Project root:** `D:\Naturin\Sample Tracking app\sample-tracking-system\`
(Note: the outer folder `D:\Naturin\Sample Tracking app\` also contains `supabase/schema.sql` and an empty `.env.local` directory — see Section 5 #6.)

---

## 2. CURRENT STATE AT A GLANCE

The app is **functional and verified end-to-end** as of 2026-08-06:
- Schema applied, tables exist, seed data present.
- Create → list → detail → status update → follow-up visits all work against the live Supabase DB.
- Homepage redirects to `/samples`.
- Sales rep attribution present (dropdown-backed, pre-auth).
- The previously-broken `product:products(*)` join now resolves.

See Section 8 for the full stabilization record.

---

## 3. PROJECT STRUCTURE (what exists)

```
sample-tracking-system/
├── app/                          ← THE app (App Router)
│   ├── layout.tsx                # Global layout + nav (Sample Tracking / All Samples / New Sample)
│   ├── page.tsx                  # Homepage → 307 redirect to /samples
│   ├── globals.css
│   ├── components/StatusBadge.tsx # colored pill for output status
│   ├── samples/
│   │   ├── page.tsx              # list all samples (via API), shows product / rep / status / visits
│   │   ├── create/page.tsx       # create form (via API): product UUID dropdown + rep dropdown
│   │   └── [sample_id]/page.tsx  # detail: info + status update + add follow-up visit
│   └── api/                      ← the SOURCE OF TRUTH for data access (pages call these)
│       ├── samples/route.ts      # GET (list) + POST (create)
│       ├── samples/[id]/route.ts # GET (detail) + PUT (update status)
│       ├── products/route.ts     # GET (product catalog for dropdown)
│       ├── users/route.ts        # GET (sales reps for dropdown)
│       └── visits/route.ts       # POST (add visit)
├── lib/
│   ├── supabase.ts               # Supabase client (reads NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)
│   └── catalog.ts                # product catalog source → seeded into the `products` table
├── supabase/
│   ├── associated schema in outer folder  # see note below
│   ├── fk_constraints.sql      # ADDED — FK constraints enabling PostgREST joins
│   ├── seed_products.sql        # seeds 65 products into `products`
│   └── rls_policies.sql         # RLS enabling anon read/write for the app tables
├── scripts/generate_seed.mjs    # generator for seed_products.sql
├── prompts/claude-code-fix-prompt.md  # the 7-step fix plan this pass followed
├── .env.local                   # Supabase credentials (gitignored)
├── README.md / STATUS.md / tsconfig.json / package.json / eslint.config.mjs / next.config.ts
└── Start Sample Tracker.bat     # one-click dev launcher
```

> **Schema location quirk:** the canonical `schema.sql` lives in the **outer** folder
> (`D:\Naturin\Sample Tracking app\supabase\schema.sql`), while newer SQL helpers
> (`seed_products.sql`, `rls_policies.sql`, `fk_constraints.sql`) live in the inner
> `sample-tracking-system/supabase/`. Future schema edits should consolidate into one place.

**Data model (applied to Supabase):** `users`, `products`, `samples`, `visits` (see Section 4).

---

## 4. DATA MODEL (as applied, with FK relationships)

- **users** — sales reps & team. `user_id` PK, `user_name`, `role`, soft-delete columns. Seeded: Sales Rep 1/2/3 (placeholder identities).
- **products** — catalog. `product_id` PK, `product_name`, `variant_name`, `category`. Seeded from `lib/catalog.ts` (65+ rows across 14 categories), each with a real UUID.
- **samples** — the core record. `product_id → products(product_id)` (FK), `sales_rep_id → users(user_id)` (FK), `output` dropdown (Pending/Closed/Onboard/Not Interested/Interested but need time), dates, soft-delete. `sales_rep_id` is nullable pre-auth.
- **visits** — follow-ups per sample, one-to-many. `sample_id → samples(sample_id)` (FK), `visit_number` unique per sample (auto-incremented server-side).

**Foreign keys ARE now defined** (added in the 7-step pass) so PostgREST embedded joins resolve. This was the previously-missing piece that broke the list/detail join.

---

## 5. ARCHITECTURAL DECISIONS (recorded choices, not open questions)

1. **Product normalization (RESOLVED).** Products live in the `products` table, keyed by UUID `product_id`. The create form stores the `product_id` UUID; the drop lists render `product_name`. This was previously a source of a broken join.
2. **API routes are the data-access layer (RESOLVED).** All pages call the `app/api/*` routes, not Supabase directly. Single place for validation/error handling, and in v2 auth checks are added right at the API routes.
3. **Sales rep is stored client-selected (pre-auth).** The create form has a rep dropdown seeded from `users`. Commented: replaced by session attribution when per-rep auth ships in v2.
4. **Homepage is a redirect (RESOLVED).** `app/page.tsx` issues a 307 to `/samples` — the simplest sensible home.

---

## 6. WHAT'S NOT DONE / DEFERRED (v2 scope — intentionally out of the fix pass)

- **Auth/login** — explicitly deferred to v2. Rep attribution is manual (dropdown), not session-based.
- **Dashboard / exportable reports** — deferred to v2.
- **Automated follow-up reminders** — deferred to v2.
- **Order-value tracking** — deferred to v2.
- **No tests written** — Jest is installed but no test files. A happy-path test for create/status-update is the recommended first step once stable.
- **`sales_rep_id` on existing rows** — pre-existing samples have `sales_rep_id = null`; rep must be backfilled if needed.

---

## 7. KNOWN MINOR / CLEANUP SNAGS

- 🟡 **Outer-folder cruft** — `D:\Naturin\Sample Tracking app\.env.local` is an empty *directory*, and the outer `supabase/schema.sql` duplicates the inner schema helpers. Consider consolidating.
- 🟡 **Junk seed reference** — `lib/catalog.ts` is the true source; the outer `schema.sql` and any loose HTML snapshots in the repo root should be removed (the fix pass already deleted `samples.txt`/`homepage.txt`).
- 🟡 **README.md is still the create-next-app default** — not yet rewritten to describe this app.

---

## 8. HOW TO RUN

```bash
cd "/d/Naturin/Sample Tracking app/sample-tracking-system"
npm install          # already present
npm run dev          # → http://localhost:3000
```
Or double-click the Desktop shortcut **"Sample Tracker App.lnk"** (→ `Start Sample Tracker.bat`).
Production: `npm run build` then `npm run start`.

---

## 9. STABILIZATION RECORD (what this fix pass changed, 2026-08-06)

Sequenced work driven by `prompts/claude-code-fix-prompt.md` (a 7-step plan):

1. **Verified + applied schema.** Confirmed project `zjorbirihnswldxmpyvt`, applied `schema.sql` and seed data via SQL Editor.
2. **Fixed product_id string→UUID** — seeded `products` from catalog, form submits real UUIDs, joins corrected.
3. **Fixed homepage stub** — now a 307 redirect to `/samples`.
4. **Cleaned structural cruft** — removed duplicate `src/app/`, `samples.txt`, `homepage.txt`; standardized pages on API routes.
5. **Added sales-rep field (pre-auth)** — rep dropdown in create form, `sales_rep_id` POSTed and stored; commented for v2 auth replacement.
6. **Verified end-to-end** — create / list / detail / status update / visit increment all tested against live DB and pass.
   - 🔴 BUG FOUND & FIXED — **FK constraints missing** → `samples↔products` join failed. Added `fk_constraints.sql`; verified the join now resolves.
7. **This STATUS.md updated** to reflect the stabilized state.

---

## 10. 60-SECOND NEXT ACTIONS (recommended, in order)

1. ✅ **DONE at this pass** — the app is working end-to-end.
2. **Verify in the browser** — run the app, create a real sample, view it in the list/detail (tests a fresh rep needed an actual rep row? placeholders currently "Sales Rep 1/2/3").
3. **Optionally rename placeholder reps** to real names via the SQL Editor or `/api/users`.
4. **Write the first happy-path tests** (Jest) for ACME-style create & status update once stability is confirmed.
5. **Consolidate schema location** and remove leftover root files; update README.
6. After each change, `git add` / commit / push to keep GitHub in sync (branch `master`, remote `origin` → `https://github.com/sakshamvarshney4394/Claude-Code.git`).

---

*End of STATUS doc — reflects the real, verified state as of 2026-08-06.*