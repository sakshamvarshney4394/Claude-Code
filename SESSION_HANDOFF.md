# 🎯 SESSION HANDOFF — Sample Tracker for Naturin

> **READ THIS FIRST.** Current authoritative handoff for the next Claude session.
>
> **Written:** 2026-08-11 (end of the *create-form → list-page → edit/download/share* sessions).
>
> **Supersedes (now stale):** `STATUS.md` (2026-08-06), `INSTRUCTIONS.md` (2026-08-06),
> `NEXT_SESSION_INSTRUCTIONS.md` (2026-08-07). You may delete or consolidate those later;
> don't rely on them — this file is the truth.

---

## 1. WHERE YOU'RE PICKING UP

| | |
|---|---|
| **Project** | Sample Tracking System — internal B2B tool for Naturin sales reps |
| **Root** | `D:\Naturin\Sample Tracking app\sample-tracking-system\` |
| **Stack (verified)** | Next.js **16.3.0** (App Router, Turbopack) · React 19.2.8 · TypeScript · Tailwind **v4** · Supabase (`@supabase/supabase-js`, anon key, client-side) · `lucide-react` icons · `xlsx` (SheetJS) |
| **Git** | branch `master` → `origin` = `https://github.com/sakshamvarshney4394/Claude-Code.git` — **in sync** (HEAD `2094867`) |
| **DB project** | Supabase `zjorbirihnswldxmpyvt` (schema applied via Dashboard → SQL Editor) |
| **Env** | `.env.local` = `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (**gitignored — never commit**) |

**The app builds clean and all pages work against live Supabase.** Read section 5 for the ONE manual DB step still pending.

---

## 2. SCREENS & API (current state)

**Pages (`app/`):**
- `page.tsx` — homepage → 307 redirect to `/samples`
- `samples/page.tsx` — **list**: search bar (text + date, AND, client-side) · stats colour-blocks · desktop table + mobile cards · **Address column** · per-row **"Actions" dropdown** (View / Edit / Delete) · Export to Excel (`.xlsx`)
- `samples/create/page.tsx` — **create form**; reads query-param prefill (see §4); Category has an **"Others"** option with a custom-text input; **State** dropdown (28 states + 8 UTs); "Address" field; "+ Add Another Sample for [Client]" on success
- `samples/[sample_id]/page.tsx` — **detail**: info cards, status update, add-follow-up-visit, **Download** button (single sample + visits → `.xlsx`), **Share** button (URL copy)
- `samples/[sample_id]/edit/page.tsx` — **NEW this session**: full edit form, saves via `PATCH`; visits are NOT editable here (stays on detail page); also has "Add Another Sample for this Client"

**API routes (`app/api/`) — pages call these, never Supabase directly:**
| Route | Methods |
|---|---|
| `/api/products` | GET (catalog for dropdowns) |
| `/api/users` | GET (sales reps for dropdowns) |
| `/api/samples` | GET (list, `select('*')` + views joins) · POST (create) · DELETE (clear-all — still present, no UI trigger anymore) |
| `/api/samples/[id]` | GET (detail) · **PUT** (status-only update) · **PATCH** (full-field edit) · DELETE (cascade visits first) |
| `/api/visits` | POST (add visit; visit_number auto-incremented) |

---

## 3. DATA MODEL

`users` (reps) · `products` (catalog, 65+ seeded) · `samples` (core) · `visits` (1→many, FK `samples`)
Real FK constraints exist (`supabase/fk_constraints.sql`) → PostgREST joins resolve.

`samples` fields used by the app: `party_name`, `product_id`→products, `sales_rep_id`→users (nullable, pre-auth), `category` (denormalized, can be a **custom text** when "Others" was chosen), `poc_name`, `poc_contact`, `designation`, `location` (shown as **Address**), **`state`** (⚠ not live yet — see §5), `sample_submission_date`, `next_visit_date`, `output` (Pending/Onboard/Closed/Not Interested/Interested but need time), soft-delete + timestamps.

**Supabase SQL files** (`supabase/`): `fk_constraints.sql`, `rls_policies.sql`, `seed_products.sql`, **`add_state_column.sql` — NEW, NOT YET APPLIED to the live DB**.

---

## 4. KEY MECHANISM — query-param prefill (reuse it, don't duplicate)

The create form prefills client/shared fields generically from URL query params:
`/samples/create?party_name=&location=&state=&poc_name=&poc_contact=&designation=`
- Reads `useSearchParams()` in a `useEffect` → fills those 6 fields, **blanks** Product / Category / Sample Submission Date / Next Visit Date for a fresh entry, clears success/error.
- Wrapped in `<Suspense>` in the default export (required for `useSearchParams` statically-rendered pages).
- **Fired per-param-change**, so it works both on first mount *and* when navigating from within the app (e.g. the "+ Add Another Sample" button does `router.push('/samples/create?…')` from the create *and* edit pages).
- **Edit `[sample_id]/edit` was built to reuse this** — any future link/Edit-page prefill should keep using the same URL-param pattern. Don't add a second code path.

**Naming standard now in use** (label text only — DB/API/variable names were NOT renamed): **Client Name** (was Party Name), **Sales Representative** (was Sales Rep), **Address** (was Location — create/edit forms only), **State** (new).
> Note: the detail page still labels the field **"Location"** (`app/samples/[sample_id]/page.tsx`) — an inconsistent leftover from the scoped rename. Small cleanup candidate.

---

## 5. ⚠️ PENDING BLOCKER — `state` column NOT in the live DB

Saving a sample (create or edit) with a **State** value currently fails with:
> `Could not find the 'state' column of 'samples' in the schema cache`

**Because** the code sends `state` but the column doesn't exist in Supabase yet. Expected the user to run the migration; **verify it's applied before writing more code against `state`**. The one-time fix (in Supabase Dashboard → SQL Editor → project `zjorbirihnswldxmpyvt`):

```sql
ALTER TABLE public.samples ADD COLUMN IF NOT EXISTS state TEXT;
```

Then retry a save. (`NOTIFY pgrst, 'reload schema';` if the error lingers ~30s.)

---

## 6. DESIGN SYSTEM (flat — follow it)

- **Colors:** bg `#F3F4F6` (gray-100 page) / surfaces white, text `#111827`; Primary blue-500 `#3B82F6`, Secondary emerald-500 `#10B981`, Accent amber-500 `#F59E0B`, border gray-200.
- **Type:** Outfit (via `next/font` in `layout.tsx`); headings bold/extrabold, tight tracking.
- **Shape:** `rounded-md/lg`; `**no shadows anywhere**` (`.card { box-shadow: none; }`); focused inputs = white + `border-2` primary.
- **Tokens:** `.input`, `.btn` (`.btn-primary/.btn-secondary/.btn-danger`), `.card` defined in `app/globals.css` (Tailwind v4 — **`@import "tailwindcss"`, NOT v3 `@tailwind` directives**).
- **Status badges:** `app/components/StatusBadge.tsx` (Amber Pending, Emerald Onboard, Gray Closed…).
- **Dropdowns:** the list's "Actions" menu is `position: fixed` from the trigger's viewport rect to avoid `overflow-x-auto` clipping; closes on outside-click/scroll/resize. Follow that pattern if adding menus elsewhere.

---

## 7. RULES / CONSTRAINTS (do not violate)

1. **Pages call API routes; API routes call Supabase.** Never call Supabase from client components directly.
2. Don't rename DB columns, API fields, file structure, or component props — the code uses `party_name`/`sales_rep_id`/`location` internally.
3. Don't re-add a **sidebar** — the single top bar layout is deliberate (a duplicate-nav bug was fixed). Ask before adding navigation.
4. Don't edit `.env.local` into git.
5. Keep renaming/cleaning *scoped* — the earlier sessions deliberately left "Location" on the detail page and kept `DELETE /api/samples` alive with no UI. Match the existing flat styling; keep things accessible.
6. Embrace-and-extend the **prefill** + **PATCH** + **cascade-delete** patterns already in place rather than inventing new ones.

---

## 8. HOW TO RUN / VERIFY

```bash
cd "/d/Naturin/Sample Tracking app/sample-tracking-system"
npm run dev        # http://localhost:3000 (Turbopack)
npm run build      # must pass (typecheck included)
npm run lint       # ok if some pre-existing `any` in API routes
```

- API smoke: `GET /api/products`, `GET /api/users`, `GET /api/samples`, `GET /api/samples/:id`, `POST /api/samples`, `PATCH /api/samples/:id`, `DELETE /api/samples/:id` (cascades visits), `DELETE /api/samples` (clear-all; no UI).
- Latest commits relation: `729c3eb` (old) → `add79fa` (create form) → `f928f31` (list) → `2094867` (edit/download/share) → all pushed.

---

## 9. KNOWN ISSUES / CANDIDATE NEXT STEPS (confirm with the user first)

**Pending / open:**
- 🔴 **`state` migration not applied** (§5) — the live blocker; everything else works.
- **Share link has no access control** — expected/accepted: the app has **no auth**, so any shared detail URL is openly viewable. Auth is v2.
- **Readme is still the create-next-app default**; `STATUS.md` + the two older handoff docs are stale (this file supersedes them) — candidates to consolidate/rewrite.
- **No tests** (Jest 30/ts-jest installed). An edit/PATCH + validation test is a good first one.
- **`output` status variance**: edit page updates status via PATCH with the same valid-set as PUT; both are validated.

**v2 / out of scope (do not start without an explicit ask):** real per-rep **auth** (replaces rep dropdown + gates share links), dashboards/reports, follow-up reminders, order-value tracking.

---

*End of handoff. Keep this file updated at the end of each session — the others are stale.*