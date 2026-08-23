# Clear All Data Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Clear All Data" button that deletes all samples and their associated visits while preserving products and users, with confirmation dialog and proper error handling.

**Architecture:** 
- Add a DELETE endpoint at `/api/samples` that deletes all visits first (due to foreign key constraint) then all samples.
- Add a button component in `app/samples/page.tsx` that shows when samples exist, triggers confirmation dialog, calls the DELETE endpoint, and refreshes the sample list.
- Follow existing patterns: pages call API routes, API routes use Supabase client.

**Tech Stack:** Next.js 16.3.0 (App Router), React 19.2.8, TypeScript, Tailwind CSS v4, Supabase (@supabase/supabase-js)

## Global Constraints
- Only delete `samples` and `visits` tables; keep `products` and `users` intact.
- Button placement: bottom of the All Samples page (`/samples`), visually separated, shown only when there is data to clear.
- Confirmation: browser confirm dialog with message "Delete all N samples and their visits? This cannot be undone."
- Maintain existing code patterns: API routes as data-access layer, pages call API routes.
- Preserve existing error handling and loading states.
- Do not modify `.env.local` or commit it.
- Branch: `master`, remote: `https://github.com/sakshamvarshney4394/Claude-Code.git`

---
### Task 1: Add DELETE endpoint to API route

**Files:**
- Modify: `D:/Naturin/Sample Tracking app/sample-tracking-system/app/api/samples/route.ts`

**Interfaces:**
- Consumes: None (DELETE request with no body)
- Produces: JSON response `{ deleted: number }` on success or `{ error: string }` on failure

- [ ] **Step 1: Write the DELETE function skeleton**

```typescript
export async function DELETE(request: NextRequest) {
  try {
    // TODO: Delete all visits first, then all samples
    return NextResponse.json({ deleted: 0 }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Implement deletion of visits**

```typescript
const { error: visitsError } = await supabase.from('visits').delete().neq('visit_id', '');
```

- [ ] **Step 3: Implement deletion of samples**

```typescript
const { data, error: samplesError } = await supabase.from('samples').delete().neq('sample_id', '').select();
```

- [ ] **Step 4: Handle errors and return response**

```typescript
if (visitsError) {
  throw visitsError;
}
if (samplesError) {
  throw samplesError;
}
return NextResponse.json({ deleted: data.length }, { status: 200 });
```

- [ ] **Step 5: Add comment about FK order**

```typescript
// Delete visits first due to foreign key constraint: visits.sample_id references samples.sample_id
```

- [ ] **Step 6: Commit the API route changes**

```bash
git add app/api/samples/route.ts
git commit -m "feat: add DELETE /api/samples endpoint for clear all data"
```

### Task 2: Add Clear All Data button to samples page

**Files:**
- Modify: `D:/Naturin/Sample Tracking app/sample-tracking-system/app/samples/page.tsx`

**Interfaces:**
- Consumes: `samples` array state, `setSamples` setter
- Produces: UI button with confirm dialog and data clearing functionality

- [ ] **Step 1: Import useState for button state**

Add to existing imports:
```typescript
const [clearing, setClearing] = useState(false);
const [clearError, setClearError] = useState<string | null>(null);
```

- [ ] **Step 2: Create handleClearAll function**

```typescript
async function handleClearAll() {
  if (!window.confirm(`Delete all ${samples.length} samples and their visits? This cannot be undone.`)) {
    return;
  }

  setClearing(true);
  setClearError(null);

  try {
    const res = await fetch('/api/samples', {
      method: 'DELETE',
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || 'Failed to clear data');
    }

    // Clear the local samples list
    setSamples([]);
  } catch (err) {
    setClearError(`Could not clear data: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setClearing(false);
  }
}
```

- [ ] **Step 3: Add button rendering logic**

After the stats cards section (around line 315), add:
```typescript
{ samples.length > 0 && (
  <div className="flex justify-end mt-6">
    <button
      type="button"
      disabled={clearing}
      onClick={handleClearAll}
      className={`btn btn-${clearing ? 'secondary' : 'destructive'} text-sm px-4 py-2 ${
        clearing ? 'opacity-50' : ''
      }`}
    >
      {clearing ? (
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          Clearing...
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" /> Clear All Data
        </span>
      )}
    </button>
    {clearError && (
      <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm">{clearError}</p>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Commit the page changes**

```bash
git add app/samples/page.tsx
git commit -m "feat: add Clear All Data button to samples page"
```

### Task 3: Typecheck the changes

**Files:**
- None (validation step)

**Interfaces:**
- None

- [ ] **Step 1: Run TypeScript compiler**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Commit if typecheck passes (or fix any errors)**

```bash
# If successful, commit with a note
git commit --allow-empty -m "chore: verify typecheck passes for clear all data feature"
```

### Task 4: Verify end-to-end functionality

**Files:**
- None (validation step)

**Interfaces:**
- None

- [ ] **Step 1: Start development server**

```bash
npm run dev
```

- [ ] **Step 2: Create test samples**

Navigate to http://localhost:3000/samples/create and create 1-2 sample entries via the form.

- [ ] **Step 3: Verify Clear All Data button appears**

Check that the button is visible at the bottom of the All Samples page.

- [ ] **Step 4: Test confirmation dialog**

Click the button, verify confirmation dialog shows correct count, cancel action does nothing.

- [ ] **Step 5: Test successful clear**

Confirm dialog, verify samples list empties, button disappears, success state shown.

- [ ] **Step 6: Verify products and users persist**

Check that `/api/products` and `/api/users` still return data (can test via browser dev tools or API client).

- [ ] **Step 7: Test error handling (optional)**

Simulate error by temporarily breaking the API endpoint, verify error banner appears.

- [ ] **Step 8: Stop development server**

```bash
# Ctrl+C in terminal
```

- [ ] **Step 9: Commit verification completion**

```bash
git commit --allow-empty -m "chore: verify clear all data functionality end-to-end"
```