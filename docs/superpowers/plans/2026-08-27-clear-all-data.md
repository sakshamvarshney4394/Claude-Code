# Clear All Data Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Clear All Data" button at the bottom of the All Samples page (`/samples`) that deletes all samples and their associated visits via a confirmed `DELETE /api/samples` call, while preserving products and users.

**Architecture:** Follows existing pattern — pages call API routes, API routes call Supabase. New `DELETE` handler in `app/api/samples/route.ts` deletes `visits` first (FK order), then `samples`, returning deleted count. Frontend button at bottom of `app/samples/page.tsx` shows confirm dialog, calls API, reloads list.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Supabase (`@supabase/supabase-js`)

## Global Constraints

- **Delete order matters:** `visits.sample_id` → `samples.sample_id` FK means visits must be deleted before samples.
- **API pattern:** Pages call `/api/*` routes; routes call Supabase. No direct Supabase calls from pages.
- **Auth deferred to v2:** No session checks — this endpoint is unauthenticated like other collection routes. User confirmed they want it this way.
- **Products/users preserved:** Only `samples` and `visits` tables are affected.
- **Typecheck required:** `npx tsc --noEmit` must pass before commit.
- **Verify end-to-end:** Start dev server, create sample, click button, confirm list empties, verify `/api/products` and `/api/users` still return data.

---

### Task 1: Add DELETE handler to `app/api/samples/route.ts`

**Files:**
- Modify: `app/api/samples/route.ts`

**Interfaces:**
- Consumes: Existing Supabase client from `@/lib/supabase`
- Produces: `export async function DELETE()` returning `NextResponse<{ deleted: number } | { error: string }>`

- [ ] **Step 1: Write the failing test**

No automated tests exist yet (Jest installed but no test files). Skip test creation — manual verification in Task 4.

- [ ] **Step 2: Implement DELETE handler**

```typescript
export async function DELETE() {
  try {
    // Step 1: Delete all visits first (FK: visits.sample_id → samples.sample_id)
    const { error: visitsError, count: visitsDeleted } = await supabase
      .from('visits')
      .delete()
      .neq('visit_id', '00000000-0000-0000-0000-000000000000') // match all rows

    if (visitsError) {
      return NextResponse.json({ error: visitsError.message }, { status: 500 })
    }

    // Step 2: Delete all samples
    const { error: samplesError, count: samplesDeleted } = await supabase
      .from('samples')
      .delete()
      .neq('sample_id', '00000000-0000-0000-0000-000000000000')

    if (samplesError) {
      return NextResponse.json({ error: samplesError.message }, { status: 500 })
    }

    return NextResponse.json({ deleted: samplesDeleted ?? 0 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

Note: Using `.neq('id', '00000000-...')` is the Supabase pattern for "delete all rows" since `.delete()` requires a filter.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from project root
Expected: PASS (no errors)

- [ ] **Step 4: Commit**

```bash
git add app/api/samples/route.ts
git commit -m "feat(api): add DELETE /api/samples to clear all samples and visits"
```

---

### Task 2: Add Clear All Data button to `app/samples/page.tsx`

**Files:**
- Modify: `app/samples/page.tsx`

**Interfaces:**
- Consumes: `samples` state (already loaded), existing `fetchSamples` function
- Produces: New state `clearing` (boolean), `clearError` (string | null), handler `handleClearAll()`, button rendered when `samples.length > 0`

- [ ] **Step 1: Add state for clearing flow**

Add after line 145 (after `deletingId` state):

```typescript
const [clearing, setClearing] = useState(false)
const [clearError, setClearError] = useState<string | null>(null)
```

- [ ] **Step 2: Implement handleClearAll function**

Add after `handleDeleteSample` function (around line 197):

```typescript
async function handleClearAll() {
  // Confirm with count
  const count = samples.length
  if (!window.confirm(`Delete all ${count} sample${count === 1 ? '' : 's'} and their visits? This cannot be undone.`)) {
    return
  }

  setClearing(true)
  setClearError(null)

  try {
    const res = await fetch('/api/samples', { method: 'DELETE' })
    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.error || 'Failed to clear data')
    }

    // Reload the samples list
    const fresh = await fetch('/api/samples')
    const freshJson = await fresh.json()
    if (freshJson.data) {
      setSamples(freshJson.data)
    }
  } catch (err) {
    setClearError(`Could not clear data: ${err instanceof Error ? err.message : 'Unknown error'}`)
  } finally {
    setClearing(false)
  }
}
```

- [ ] **Step 3: Render error banner for clear errors**

Add after the `rowError` banner (around line 300):

```tsx
{clearError && (
  <div className="bg-rose-100 border-2 border-rose-400 text-rose-800 px-4 py-3 rounded-md">
    <p className="font-medium">Could not clear all data</p>
    <p className="text-sm">{clearError}</p>
  </div>
)}
```

- [ ] **Step 4: Render the Clear All Data button**

Add at the bottom of the page, inside the `else` block (after the mobile cards, before the closing `</>`), around line 474:

```tsx
{/* Clear All Data button — only when there are samples */}
{samples.length > 0 && (
  <div className="mt-8 pt-6 border-t border-gray-200">
    <button
      onClick={handleClearAll}
      disabled={clearing}
      className="btn btn-secondary text-sm px-6 py-3 bg-red-50 text-red-700 border-red-200 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
    >
      {clearing ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          Clearing...
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Clear All Data
        </span>
      )}
    </button>
  </div>
)}
```

Note: Uses existing `Trash2` icon import from lucide-react.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit` from project root
Expected: PASS (no errors)

- [ ] **Step 6: Commit**

```bash
git add app/samples/page.tsx
git commit -m "feat(ui): add Clear All Data button to samples page"
```

---

### Task 3: End-to-end verification

**Files:** None (manual verification)

**Interfaces:**
- Consumes: Running dev server with Supabase connection

- [ ] **Step 1: Start dev server**

Run: `npm run dev` from project root
Expected: Server starts at http://localhost:3000

- [ ] **Step 2: Create test samples**

1. Navigate to http://localhost:3000 (redirects to /samples)
2. Click "New Sample" → create 2-3 samples with different products/reps
3. Verify samples appear in the list with visits count = 0

- [ ] **Step 3: Test Clear All Data**

1. Scroll to bottom of page → see "Clear All Data" button (red, with trash icon)
2. Click button → confirm dialog appears with correct count (e.g., "Delete all 3 samples and their visits?")
3. Click Cancel → nothing happens, list unchanged
4. Click button again → confirm dialog → click OK
5. Button shows "Clearing..." spinner, then list empties
6. Stats cards show 0 Total Samples, 0 Response Pending, 0 Onboarded Client

- [ ] **Step 4: Verify products and users intact**

1. In browser console or new tab, call:
   - `fetch('/api/products').then(r => r.json()).then(console.log)` → should return 65+ products
   - `fetch('/api/users').then(r => r.json()).then(console.log)` → should return 3 users

- [ ] **Step 5: Verify error handling**

1. (Optional) Temporarily break Supabase connection in `.env.local`, click Clear All → error banner appears

- [ ] **Step 6: Commit any fixes**

```bash
git add .
git commit -m "fix: any adjustments from E2E verification"
```

---

### Task 4: Push to GitHub

**Files:** None

- [ ] **Step 1: Push to origin/master**

```bash
git push origin master
```

Expected: Push succeeds, GitHub shows new commits

- [ ] **Step 2: Verify deployment (if auto-deploy configured)**

Check Vercel or deployment target if applicable.