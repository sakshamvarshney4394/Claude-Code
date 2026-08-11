# 📌 INSTRUCTIONS — Continue Here Next Session

> **Purpose:** Give the next Claude Code session everything it needs to resume work
> on this project in seconds. Read this first, then `STATUS.md` for full context.
>
> **Written:** 2026-08-06

---

## 1. WHERE YOU'RE PICKING UP

**Project:** Sample Tracker App for Naturin
**Root:** `D:\Naturin\Sample Tracking app\sample-tracking-system\`

The app is **stable and verified end-to-end** (all 7 steps of the earlier fix pass
are done and pushed to GitHub). The current working feature is:

> ## ⏳ ACTIVE TASK — "Clear All Data" button (DESIGN APPROVED, NOT YET IMPLEMENTED)
>
> User's words: *"add a clear all data button at the end to clear the wrong or
> useless data."*
>
> The brainstorming session **approved the design** but stopped before writing the
> implementation plan or code. **Your job: continue from here.**

---

## 2. APPROVED DESIGN FOR THE CLEAR-ALL-DATA FEATURE

Three decisions were confirmed with the user:

1. **Scope — delete only `samples` + their `visits`.** Keep `products` (catalog)
   and `users` (sales reps) intact so the create-form dropdowns still work.
2. **Placement — bottom of the All Samples page** (`/samples`), visually separated,
   shown only when there is data to clear.
3. **Confirmation — browser confirm dialog** (e.g. `window.confirm`), e.g.
   "Delete all N samples and their visits? This cannot be undone."

**Chosen approach (Approach A):** a dedicated server-side delete.

- Add **`DELETE /api/samples`** in `app/api/samples/route.ts` that:
  1. Deletes **all rows from `visits` first** (FK order — `visits.sample_id`
     references `samples.sample_id`, so visits must go before samples).
  2. Then deletes **all rows from `samples`**.
  3. Returns `{ deleted: <n> }` + 200, or `{ error }` + 500 on failure.
- Add a red **"Clear All Data"** button at the bottom of `app/samples/page.tsx`:
  - only rendered when `samples.length > 0`
  - shows the confirm dialog, calls `DELETE /api/samples`, then reloads the list
  - shows a brief error banner on failure

**Explicitly rejected (do not build):**
- Deleting products/users (user chose samples+visits only).
- Client-side direct Supabase calls (violates the "pages call API routes" rule).

---

## 3. IMPLEMENTATION PLAN (what to do next)

1. **Write the implementation plan** — invoke `superpowers:writing-plans` (the
   brainstorming flow's terminal step). The design above is the approved input.
2. **Implement `DELETE /api/samples`** in `app/api/samples/route.ts`:
   - `export async function DELETE()` — delete visits, then samples.
   - Comment why order matters (FK relationship).
3. **Implement the button** in `app/samples/page.tsx`:
   - Add state for the clearing in-progress flag + error.
   - `handleClearAll()` with `window.confirm`, `fetch('/api/samples', { method: 'DELETE' })`, reload.
   - Render the red button at the bottom when `samples.length > 0`.
4. **Typecheck** — `npx tsc --noEmit`.
5. **Verify end-to-end** (same rigor as the fix pass):
   - start `npm run dev`, create 1+ sample via the form,
   - click Clear All Data, confirm dialog appears, list empties,
   - confirm `products` and `users` are still intact via `/api/products` and `/api/users`.
6. **Commit + push** to `origin/master` (repo: `https://github.com/sakshamvarshney4394/Claude-Code.git`).

---

## 4. HOW TO RUN / VERIFY (cheat sheet)

```bash
cd "/d/Naturin/Sample Tracking app/sample-tracking-system"
npm run dev          # → http://localhost:3000
```

- API smoke tests:
  - `GET  /api/samples`    → list with joined `product`, `sales_rep`, `visits`
  - `GET  /api/products`   → product catalog (must stay populated after clear)
  - `GET  /api/users`      → sales reps (must stay populated after clear)
  - `DELETE /api/samples`  → **new** — clears samples + visits
- Git: branch `master`, remote `origin` → `https://github.com/sakshamvarshney4394/Claude-Code.git`

---

## 5. KEY CONTEXT AT A GLANCE

- **STATUS.md** (root) — full project status, data model, decisions, known snags.
  Read it if you need more than this sheet.
- **`supabase/fk_constraints.sql`** — FK constraints (visits→samples, samples→products,
  samples→users). These are why the joins resolve; **respect the FK order when deleting.**
- **Pages call API routes; API routes call Supabase.** Keep that pattern.
- **Sales rep field is pre-auth** (dropdown), replaced by session attribution in v2.
- `.env.local` is gitignored — never commit it.
- The user earlier referred to this kind of file loosely as "instructions.md" —
  if they ask again, this file (`INSTRUCTIONS.md`) is the canonical handoff.
