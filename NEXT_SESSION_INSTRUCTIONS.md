# NEXT SESSION INSTRUCTIONS

> **READ THIS FIRST before making any changes.** This is a Next.js + Supabase sample-tracking app
> for Naturin sales reps (internal B2B tool). It currently runs and passes `npm run build`.
> Two commits are committed locally but **NOT pushed** to `origin/master`.

---

## 1. Project State (as of last session)

**Stack:** Next.js 16.3.0 (App Router, Turbopack) · React 19.2.8 · TypeScript · Tailwind CSS **v4** · Supabase (`@supabase/supabase-js`) · `lucide-react` icons · `xlsx` (SheetJS) for Excel export.

**Data model:** `products`, `users` (sales reps), `samples`, `visits`. Real FK constraints exist
(`products.product_id`, `sales_rep_id`, `visits.sample_id`). RLS is on for anon role; no auth yet (deferred to v2).

**Screens:**
- `app/samples/page.tsx` — list: stats color-blocks, desktop table (≥768px) + mobile stacked cards, per-row Delete, Export to Excel, Clear All Data.
- `app/samples/create/page.tsx` — create form (flat inputs, 2-col on lg).
- `app/samples/[sample_id]/page.tsx` — detail: info cards, status update, follow-up visits.
- `app/page.tsx` — homepage/redirect.
- API routes under `app/api/*` (products, samples, samples/[id], users, visits).

### Layout (recently simplified — single top bar)
`app/layout.tsx` renders ONE top navigation bar (logo + All Samples link + New Sample button), a
bottom nav (mobile only), and a fixed mobile FAB. There is **no sidebar anymore** — the duplicate
sidebar was intentionally removed to fix a double-nav bug. Do not re-add a sidebar without asking.

### Dependencies installed: `lucide-react`, `xlsx` — both present in `package.json`.

---

## 2. Recent Work (last two commits)

### Commit `bff55cf` — "fix: Tailwind v4 styling, hydration, and flat design system"
- Fixed root cause of unstyled UI: `globals.css` used **Tailwind v3 `@tailwind` directives** but the
  project has **Tailwind v4** (needs `@import "tailwindcss"`). This was why tables had no borders/spacing.
- Implemented a **flat design system** (design tokens in `globals.css`: `.input`, `.btn`, `.card`;
  Outfit font; no shadows; bordered focus states; accent badge colors — Amber Pending, Emerald Onboard, Gray Closed).
- Replaced corrupted emoji glyphs (showed as `�`) with `lucide-react` icons.

### Commit `a876efd` — "fix: single-nav layout, safe date formatting, row delete, Excel export"
- **Bug 1 fixed:** removed duplicated navigation (kept single top bar; removed desktop sidebar + detail page's own sidebar/header/bottom-nav).
- **Bug 2 fixed:** dates were malformed ("4/4/544"). Added `lib/format.ts` (timezone-independent,
  corruption-safe). **Note:** one seeded row stores `0544-04-04` — that's bad data in Supabase, not a display bug.
  Use "Clear All Data" (it asks first) or delete that row.
- **Feature:** per-row **Delete** (with confirm + cascade — call `DELETE /api/samples/:id`, which deletes visits first).
- **Feature:** **Export to Excel** (`.xlsx`) via SheetJS — client-side, uses already-loaded data, no backend endpoint.
- **Feature:** confirm dialogs on Clear All Data and row delete.

---

## 3. Git State

```
master ... 2 commits ahead of origin/master — NOT PUSHED
   bff55cf  fix: Tailwind v4 styling, hydration, and flat design system
   a876efd  fix: single-nav layout, safe date formatting, row delete, Excel export
```

To push when the user asks:
```bash
git push origin master
```

Untracked (decisions pending): `INSTRUCTIONS.md`, `NEXT_SESSION_INSTRUCTIONS.md`, `docs/` — these are docs, not yet committed.

---

## 4. Design System Reference (visual layer applied)

Follow the flat design system (in `prompt.txt` / the Flat Design token doc):
- **Colors:** White background `#FFFFFF`, text `#111827`, Primary `#3B82F6` (blue-500), Secondary `#10B981` (emerald-500), Accent `#F59E0B` (amber-500), Muted `#F3F4F6` (gray-100), Border `#E5E7EB` (gray-200).
- **Typography:** `Outfit` font (loaded in `layout.tsx` via next/font). Headings bold/extrabold, tight tracking.
- **Shape:** `rounded-md`/`rounded-lg`, generally no borders (color blocks), `border-2` for inputs.
- **Shadows:** **none.** Flat only. No glassmorphism/neumorphism/gradients on components.
- **Buttons/inputs/cards/badges:** use the `.btn`, `.input`, `.card` classes defined in `app/globals.css`.
- **Marketing patterns (hero, pricing, decorative shapes) do NOT apply** — internal B2B tool.

---

## 5. Hard Constraints / Requirements (do not violate)

1. **Do not change** data models, routes, or existing logic unless explicitly told otherwise.
2. **Do not rename** component props, routes, or file structure.
3. **Do not change** form validation logic or field behavior — only how it looks.
4. **Do not remove or alter** existing functionality.
5. Every change should be a **class-level or component-styling change** unless a feature/API change is explicitly requested.
6. Keep improvements accessible and WCAG-AA contrast on colored text.

---

## 6. How to Run / Verify

```bash
cd "/d/Naturin/Sample Tracking app/sample-tracking-system"
npm run dev        # http://localhost:3000
npm run build      # verify build passes
npm run lint       # note: some pre-existing `any` types + unused `error` vars exist in API routes (ok)
```

- `.env.local` holds Supabase URL + anon key. **Do not commit `.env.local`** (it is gitignored).
- API pattern: pages call API routes (`app/api/*`), API routes call Supabase.

---

## 7. Recommended Next Steps (candidate backlog — confirm with the user first)

- Push the 2 committed-but-unpushed commits to `origin/master`.
- Fix the pre-existing lint `any` types (optional, not functional).
- Consider per-rep auth (v2) — large, out of scope unless requested.
- Consider tests for the new delete/export/date logic.