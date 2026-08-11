# Clear All Data Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a "Clear All Data" button that deletes all samples and their associated visits while preserving products and users data.

**Architecture:** Add a DELETE endpoint in the samples API route that deletes visits first (due to foreign key constraints) then samples. Add a button component in the samples page that confirms deletion via browser confirm dialog, calls the API endpoint, and reloads the data.

**Tech Stack:** Next.js 13+, TypeScript, Supabase, React

## Global Constraints

- Only delete `samples` and `visits` tables - keep `products` and `users` intact
- Button placement: bottom of the All Samples page (`/samples`), visually separated, shown only when there is data to clear
- Confirmation: browser confirm dialog (e.g. `window.confirm`)
- Pages call API routes; API routes call Supabase (maintain existing pattern)
- Respect FK order when deleting (visits before samples due to foreign key constraint)
- Do NOT use client-side direct Supabase calls
- Do NOT delete products or users

---
### Task 1: Implement DELETE /api/samples endpoint

**Files:**
- Modify: `D:/Naturin/Sample Tracking app/sample-tracking-system/app/api/samples/route.ts`

**Interfaces:**
- Consumes: None
- Produces: `DELETE /api/samples` endpoint that returns `{ deleted: number }` or `{ error: string }`

- [ ] **Step 1: Write the failing test**

We'll test this by manually verifying the API endpoint works correctly since it's a server-side route.

- [ ] **Step 2: Add DELETE function to samples route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        product:products(*),
        sales_rep:users(*),
        visits:visits(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields. NOTE: sales_rep_id is intentionally NOT required yet —
    // auth is deferred to v2, and the create form adds a rep via a dropdown in Step 5.
    const requiredFields = ['party_name', 'product_id', 'sample_submission_date']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('samples')
      .insert({
        party_name: body.party_name,
        category: body.category || null,
        poc_name: body.poc_name || null,
        poc_contact: body.poc_contact || null,
        designation: body.designation || null,
        product_id: body.product_id,
        sample_submission_date: body.sample_submission_date,
        // sales_rep_id is nullable until auth ships (Step 5 adds the dropdown).
        sales_rep_id: body.sales_rep_id || null,
        location: body.location || null,
        // output defaults to 'Pending' per specification
        next_visit_date: body.next_visit_date || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// TODO: Implement DELETE endpoint for clearing all samples and visits
```

- [ ] **Step 3: Implement DELETE endpoint logic**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        product:products(*),
        sales_rep:users(*),
        visits:visits(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields. NOTE: sales_rep_id is intentionally NOT required yet —
    // auth is deferred to v2, and the create form adds a rep via a dropdown in Step 5.
    const requiredFields = ['party_name', 'product_id', 'sample_submission_date']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('samples')
      .insert({
        party_name: body.party_name,
        category: body.category || null,
        poc_name: body.poc_name || null,
        poc_contact: body.poc_contact || null,
        designation: body.designation || null,
        product_id: body.product_id,
        sample_submission_date: body.sample_submission_date,
        // sales_rep_id is nullable until auth ships (Step 5 adds the dropdown).
        sales_rep_id: body.sales_rep_id || null,
        location: body.location || null,
        // output defaults to 'Pending' per specification
        next_visit_date: body.next_visit_date || null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // First delete all visits (due to FK constraint: visits.sample_id references samples.sample_id)
    const { error: visitsError } = await supabase.from('visits').delete().neq('sample_id', '')
    
    if (visitsError) {
      return NextResponse.json(
        { error: `Failed to delete visits: ${visitsError.message}` },
        { status: 500 }
      )
    }

    // Then delete all samples
    const { data, error: samplesError } = await supabase.from('samples').delete().neq('sample_id', '')
    
    if (samplesError) {
      return NextResponse.json(
        { error: `Failed to delete samples: ${samplesError.message}` },
        { status: 500 }
      )
    }

    // Return count of deleted samples
    const deletedCount = data?.length || 0
    
    return NextResponse.json({ deleted: deletedCount })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Verify the implementation compiles**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add app/api/samples/route.ts
git commit -m "feat: add DELETE endpoint to clear all samples and visits"
```

### Task 2: Add Clear All Data button to samples page

**Files:**
- Modify: `D:/Naturin/Sample Tracking app/sample-tracking-system/app/samples/page.tsx`

**Interfaces:**
- Consumes: DELETE /api/samples endpoint
- Produces: UI button that triggers data clearing with confirmation

- [ ] **Step 1: Add state variables for clearing status and error**

```typescript
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import StatusBadge from '@/app/components/StatusBadge'

export default function SamplesPage() {
  const [samples, setSamples] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false) // For clearing in-progress state
  const [clearError, setClearError] = useState<string | null>(null) // For clear operation errors

  useEffect(() => {
    async function fetchSamples() {
      try {
        setLoading(true)
        // Data comes from the API route (centralized error handling; auth checks can
        // be added server-side in v2) instead of calling Supabase from the client.
        const res = await fetch('/api/samples')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load samples')
        setSamples(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load samples')
      } finally {
        setLoading(false)
      }
    }

    fetchSamples()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm">Loading samples...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 text-red-500">
        <p className="font-semibold">Failed to load samples</p>
        <p className="text-sm mt-1 opacity-80">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Samples</h1>
          <p className="text-sm text-gray-500 mt-1">
            {samples.length} {samples.length === 1 ? 'sample' : 'samples'} tracked
          </p>
        </div>
        <Link
          href="/samples/create"
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-semibold text-sm"
        >
          + Create New Sample
        </Link>
      </div>

      {!samples.length ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="text-4xl mb-3">���📋</div>
          <p className="text-gray-500">No samples found. Create your first sample to get started.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {samples.map(sample => (
            <div
              key={sample.sample_id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-5 flex justify-between items-start gap-3 border-b border-gray-100">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{sample.party_name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {sample.sample_id.slice(0, 8)}
                  </p>
                </div>
                <StatusBadge status={sample.output} />
              </div>

              <div className="p-5 flex-1 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Product</p>
                  <p className="text-gray-600 mt-0.5 truncate">
                    {sample.product?.product_name || '—'}
                    {sample.product?.variant_name ? ` (${sample.product.variant_name})` : ''}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sales Rep</p>
                  <p className="text-gray-600 mt-0.5 truncate">{sample.sales_rep?.user_name || '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Submitted</p>
                  <p className="text-gray-600 mt-0.5">
                    {sample.sample_submission_date ? new Date(sample.sample_submission_date).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Visits</p>
                  <p className="text-gray-600 mt-0.5">{sample.visits?.length || 0}</p>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <Link
                  href={`/samples/${sample.sample_id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm inline-flex items-center gap-1"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Clear All Data Button */}
      {samples.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className={`w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 font-medium flex items-center justify-center gap-2 ${clearing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {clearing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-white rounded-full animate-spin" />
                <span>Clearing...</span>
              </>
            ) : (
              <>
                <span className="trash-can-icon">���🗑��️</span>
                <span>Clear All Data</span>
              </>
            )}
          </button>
          {clearError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
              <p className="font-medium">Failed to clear data</p>
              <p className="text-sm">{clearError}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Handle clearing all samples and visits
async function handleClearAll() {
  const sampleCount = samples.length
  if (!window.confirm(`Delete all ${sampleCount} samples and their visits? This cannot be undone.`)) {
    return
  }

  setClearing(true)
  setClearError(null)

  try {
    const res = await fetch('/api/samples', {
      method: 'DELETE',
    })
    
    const json = await res.json()
    
    if (!res.ok) {
      throw new Error(json.error || 'Failed to clear data')
    }

    // Reload the samples list to reflect the cleared state
    setSamples([])
  } catch (err) {
    setClearError(err instanceof Error ? err.message : 'Failed to clear data')
  } finally {
    setClearing(false)
  }
}
```

- [ ] **Step 2: Verify the implementation compiles**

Run: `npx tsc --noEmit`

Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add app/samples/page.tsx
git commit -m "feat: add Clear All Data button with confirmation dialog"
```

### Task 3: Test the implementation end-to-end

**Files:**
- Test: Manual verification in browser

**Interfaces:**
- Consumes: DELETE /api/samples endpoint and UI button
- Produces: Working clear all data functionality

- [ ] **Step 1: Start development server**

Run: `npm run dev`

Expected: Server starts at http://localhost:3000

- [ ] **Step 2: Create test data**

1. Navigate to http://localhost:3000/samples/create
2. Fill out the form to create a sample
3. Submit the form
4. Verify sample appears in the list

- [ ] **Step 3: Test Clear All Data button**

1. Verify the "Clear All Data" button appears at the bottom of the samples list
2. Click the button
3. Verify browser confirm dialog appears with correct message
4. Confirm the deletion
5. Verify the samples list is now empty
6. Verify the button is no longer visible (since samples.length === 0)

- [ ] **Step 4: Verify products and users are preserved**

1. Navigate to http://localhost:3000/api/products
2. Verify products data is still present
3. Navigate to http://localhost:3000/api/users
4. Verify users data is still present

- [ ] **Step 5: Test error handling (optional)**

To test error handling, you could temporarily modify the DELETE endpoint to simulate an error.

- [ ] **Step 6: Stop development server**

Press Ctrl+C in the terminal

- [ ] **Step 7: Commit**

```bash
git commit -m "test: verify clear all data functionality works end-to-end"
```
