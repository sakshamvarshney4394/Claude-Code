# Analytics Entries Drill-Down Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. This
> plan is executed INLINE by a single session — no subagents (the relay serves one
> model; subagent calls fail with 503).

**Goal:** Inside every per-entity analytics details panel (one rep, one product, one
category), list the actual sample entries behind the aggregate numbers — scoped to
that entity only, filterable by clicking a status card, each row linking to
`/samples/[sample_id]`.

**Architecture:** The server keeps owning grouping. Each analytics route returns every
sample exactly ONCE in a top-level `entries: SampleEntry[]`, and every group gains
`entryIds: string[]`. The client resolves `group.entryIds` → entries through an id map.
A single shared `SampleEntriesList` component renders the table in all three panels.

**Tech Stack:** Next.js 16.3.0 (App Router), React 19.2.8, TypeScript 5 (strict),
Tailwind v4, Supabase JS 2, jest 30 + ts-jest 29.

**Branch / worktree:** `feat/analytics-entries-drilldown` at
`sample-tracking-system/.claude/worktrees/analytics-entries-drilldown`
(reused the pre-existing worktree — already provisioned with `node_modules` and
`.env.local`; fast-forwarded to checkpoint `fdedc25`).

## Global Constraints

- **No new Supabase query.** Entries come from the existing `fetchSamplesInRange`. Never
  add an inline `.select()`; `.limit(n)` does not defeat PostgREST's 1000-row cap, only
  `.range()` paging does.
- **Group by FK columns on the sample row** — `s.product_id`, `s.sales_rep_id`. NEVER
  `s.product?.id` / `s.sales_rep?.id` (those embedded tables key on `product_id` /
  `user_id`; `.id` is `undefined` on every row and collapses all groups into one).
- **Category comes from the LINKED PRODUCT** — `s.product?.category`, never the
  `samples.category` column. The entries list must agree with the aggregate above it.
- **No formula changes.** Success stays `Onboard / all samples` everywhere. Do not touch
  `formatPct` or `oneInN` signatures — `ProductPerformance`, `SalesRepPerformance`,
  `SuccessHero`, `MonthlyOutcomeChart` all import them.
- **Do not touch date-range filtering.** Entries respect the range by virtue of coming
  from the same fetch as the aggregates.
- **Analytics keeps plain-language status wording** from `PLAIN_STATUS`. `StatusBadge`
  gains an opt-in `vocabulary` prop defaulting to `'operational'` so its 4 existing
  callers are untouched. The plain branch reads `PLAIN_STATUS` — no second copy of the
  four strings.
- **Unknown statuses render their RAW stored value** (e.g. `Closed`), never "Unknown",
  and are visibly flagged. The point is finding bad data.
- **No refactoring** of the duplicated `renderDetails()` / `Fact()` helpers between
  `ProductPerformance` and `SalesRepPerformance`. Separate job.
- **jest, not vitest.** Every test is a pure-function test against `lib/analytics.ts` —
  no DOM, no React rendering, no Supabase mocks.
- `lib/analytics.ts` must keep importing nothing (it is bundled into client components
  via `StatusBadge`; pulling in `lib/supabase` would leak the client into the browser).

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `jest.config.js` | create | ts-jest preset + `@/` moduleNameMapper |
| `package.json` | modify | add `"test": "jest"` |
| `lib/__tests__/analytics-entries.test.ts` | create | the 7 acceptance criteria |
| `lib/analytics.ts` | modify | extend `RawSample`; add `SampleEntry`, `buildEntries`, `entryIds` on `GroupAnalytics`, `buildReps`, synthetic-id constants |
| `app/api/analytics/products/route.ts` | modify | return top-level `entries` |
| `app/api/analytics/categories/route.ts` | modify | return top-level `entries` |
| `app/api/analytics/reps/route.ts` | modify | delegate grouping to `buildReps`, return `entries` |
| `app/components/StatusBadge.tsx` | modify | add `vocabulary?: 'operational' \| 'plain'` |
| `app/components/analytics/SampleEntriesList.tsx` | create | the shared entries table |
| `app/components/analytics/SalesRepPerformance.tsx` | modify | wire list into rep panel; status cards → filter buttons |
| `app/components/analytics/ProductPerformance.tsx` | modify | same for product + category panels |

### Why `entryIds` lives on `GroupAnalytics`

`computeGroup(samples)` already receives exactly the group's samples. Deriving
`entryIds` there makes `entryIds.length === totalSamples` **true by construction** —
both come from the same array — and every group everywhere (products, categories, reps,
anything future) gets it for free with zero duplicated grouping logic.

### Why rep grouping moves into `lib/analytics.ts`

Acceptance criterion 7 (scoping) must be tested against the code that actually runs. The
rep grouping currently lives inline in the route, which a test cannot reach without
re-implementing it — and a second implementation is exactly the drift that produced
three different conversion rates before this module unified them. `buildReps(samples)`
is a verbatim move of the existing loop plus `entryIds`; behaviour and sort order are
unchanged.

---

## Task 1: Test scaffolding + failing acceptance tests

**Files:**
- Create: `jest.config.js`
- Modify: `package.json` (scripts)
- Create: `lib/__tests__/analytics-entries.test.ts`

**Interfaces:**
- Consumes: existing `lib/analytics.ts` exports.
- Produces: the names Task 2 must implement — `SampleEntry`, `buildEntries`,
  `buildReps`, `NO_PRODUCT_ID`, `NO_REP_ID`, and `GroupAnalytics.entryIds`.

- [ ] **Step 1: Create `jest.config.js`**

`@/lib/analytics` resolves via the tsconfig `paths` alias, which jest knows nothing
about — without `moduleNameMapper` every test fails instantly on module resolution.

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The `@/` alias mirrors tsconfig.json `paths: { "@/*": ["./*"] }`. jest does
  // not read tsconfig paths, so this mapping is what makes `@/lib/analytics`
  // resolvable from a test file.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['<rootDir>/lib/**/__tests__/**/*.test.ts'],
}
```

- [ ] **Step 2: Add the test script to `package.json`**

```json
    "lint": "eslint",
    "test": "jest"
```

- [ ] **Step 3: Write the failing acceptance tests**

Create `lib/__tests__/analytics-entries.test.ts`. Fixture builder plus the seven
criteria. Note `sample_id` is required on `RawSample` (Task 2) so fixtures must supply it.

```ts
import {
  RawSample,
  SampleEntry,
  buildEntries,
  buildProductsAndCategories,
  buildReps,
  isKnownStatus,
  NO_CATEGORY_LABEL,
  NO_PRODUCT_ID,
  NO_REP_ID,
  STATUS_ORDER,
} from '@/lib/analytics'

// A deliberately awkward corpus: two products in one category, one in another,
// a null-product row, a null-rep row, and a legacy 'Closed' status.
function corpus(): RawSample[] {
  const mk = (
    id: string,
    productId: string | null,
    productName: string | null,
    category: string | null,
    repId: string | null,
    repName: string | null,
    output: string | null,
  ): RawSample => ({
    sample_id: id,
    party_name: `Client ${id}`,
    output,
    sample_submission_date: '2026-05-01',
    location: 'Pune',
    state: 'Maharashtra',
    next_visit_date: null,
    product_id: productId,
    sales_rep_id: repId,
    product: productId ? { product_id: productId, product_name: productName, category } : null,
    sales_rep: repId ? { user_id: repId, user_name: repName } : null,
    visits: [],
  })

  return [
    mk('s1', 'p1', 'Collagen A', 'Collagen', 'r1', 'Rep One', 'Onboard'),
    mk('s2', 'p1', 'Collagen A', 'Collagen', 'r1', 'Rep One', 'Not Interested'),
    mk('s3', 'p2', 'Collagen B', 'Collagen', 'r2', 'Rep Two', 'Pending'),
    mk('s4', 'p3', 'Casing X', 'Casings', 'r1', 'Rep One', 'Interested but need time'),
    mk('s5', 'p3', 'Casing X', 'Casings', 'r2', 'Rep Two', ''),        // empty => Pending
    mk('s6', null, null, null, 'r1', 'Rep One', 'Onboard'),            // no product
    mk('s7', 'p1', 'Collagen A', 'Collagen', null, null, 'Onboard'),   // no rep
    mk('s8', 'p2', 'Collagen B', 'Collagen', 'r2', 'Rep Two', 'Closed'), // retired status
  ]
}

const byId = (samples: RawSample[]) => new Map(samples.map((s) => [s.sample_id, s]))

describe('analytics entries', () => {
  // Criterion 1
  it('gives every group an entryIds list whose length equals totalSamples', () => {
    const samples = corpus()
    const { products, categories } = buildProductsAndCategories(samples)
    const reps = buildReps(samples)
    for (const g of [...products, ...categories, ...reps]) {
      expect(g.entryIds).toHaveLength(g.totalSamples)
    }
  })

  // Criterion 2
  it('reproduces statusBreakdown by counting entries, with unknowns as the gap', () => {
    const samples = corpus()
    const entries = buildEntries(samples)
    const entryById = new Map(entries.map((e) => [e.sample_id, e]))
    const { products } = buildProductsAndCategories(samples)

    for (const group of products) {
      const groupEntries = group.entryIds.map((id) => entryById.get(id) as SampleEntry)
      for (const slice of group.statusBreakdown) {
        const counted = groupEntries.filter((e) => e.status === slice.status).length
        expect(counted).toBe(slice.count)
      }
      const cardTotal = group.statusBreakdown.reduce((n, s) => n + s.count, 0)
      const unknown = groupEntries.filter((e) => !isKnownStatus(e.status)).length
      expect(group.totalSamples - cardTotal).toBe(unknown)
      expect(groupEntries.every((e) => STATUS_ORDER.includes(e.status as never) || !e.statusIsKnown)).toBe(true)
    }
  })

  // Criterion 3
  it('sums the same across products, categories and the raw corpus', () => {
    const samples = corpus()
    const { products, categories } = buildProductsAndCategories(samples)
    const sum = (gs: { totalSamples: number }[]) => gs.reduce((n, g) => n + g.totalSamples, 0)
    expect(sum(products)).toBe(samples.length)
    expect(sum(categories)).toBe(samples.length)
    expect(buildEntries(samples)).toHaveLength(samples.length)
  })

  // Criterion 4
  it('puts null-FK samples in exactly one "No ... recorded" group and never drops them', () => {
    const samples = corpus()
    const { products, categories } = buildProductsAndCategories(samples)
    const reps = buildReps(samples)

    const noProduct = products.filter((p) => p.entryIds.includes('s6'))
    expect(noProduct).toHaveLength(1)
    expect(noProduct[0].id).toBe(NO_PRODUCT_ID)

    const noCategory = categories.filter((c) => c.entryIds.includes('s6'))
    expect(noCategory).toHaveLength(1)
    expect(noCategory[0].name).toBe(NO_CATEGORY_LABEL)

    const noRep = reps.filter((r) => r.entryIds.includes('s7'))
    expect(noRep).toHaveLength(1)
    expect(noRep[0].id).toBe(NO_REP_ID)
  })

  // Criterion 5 — entries and aggregates consume ONE array, so any date range
  // applied upstream by fetchSamplesInRange lands on both identically.
  it('derives entries from the same array the aggregates consume', () => {
    const samples = corpus()
    const inRange = samples.filter((s) => s.sample_id !== 's8') // stand-in for a range cut
    const entries = buildEntries(inRange)
    const { products } = buildProductsAndCategories(inRange)

    expect(entries.map((e) => e.sample_id).sort()).toEqual(inRange.map((s) => s.sample_id).sort())
    expect(entries.some((e) => e.sample_id === 's8')).toBe(false)
    expect(products.flatMap((p) => p.entryIds).sort()).toEqual(inRange.map((s) => s.sample_id).sort())
  })

  // Criterion 6
  it('resolves every entryId to exactly one entry and orphans none', () => {
    const samples = corpus()
    const entries = buildEntries(samples)
    const { products, categories } = buildProductsAndCategories(samples)
    const reps = buildReps(samples)

    const ids = entries.map((e) => e.sample_id)
    expect(new Set(ids).size).toBe(ids.length)

    for (const groups of [products, categories, reps]) {
      for (const g of groups) {
        for (const id of g.entryIds) {
          expect(ids.filter((x) => x === id)).toHaveLength(1)
        }
      }
      expect(new Set(groups.flatMap((g) => g.entryIds))).toEqual(new Set(ids))
    }
  })

  // Criterion 7 — SCOPING. No leakage in either direction.
  it('attributes every entry to the right group and misses none', () => {
    const samples = corpus()
    const raw = byId(samples)
    const { products, categories } = buildProductsAndCategories(samples)
    const reps = buildReps(samples)

    for (const p of products) {
      for (const id of p.entryIds) {
        expect(raw.get(id)!.product_id || NO_PRODUCT_ID).toBe(p.id)
      }
      const expected = samples.filter((s) => (s.product_id || NO_PRODUCT_ID) === p.id)
      expect(p.entryIds.sort()).toEqual(expected.map((s) => s.sample_id).sort())
    }

    for (const r of reps) {
      for (const id of r.entryIds) {
        expect(raw.get(id)!.sales_rep_id || NO_REP_ID).toBe(r.id)
      }
      const expected = samples.filter((s) => (s.sales_rep_id || NO_REP_ID) === r.id)
      expect(r.entryIds.sort()).toEqual(expected.map((s) => s.sample_id).sort())
    }

    for (const c of categories) {
      for (const id of c.entryIds) {
        expect(raw.get(id)!.product?.category || NO_CATEGORY_LABEL).toBe(c.name)
      }
      const expected = samples.filter((s) => (s.product?.category || NO_CATEGORY_LABEL) === c.name)
      expect(c.entryIds.sort()).toEqual(expected.map((s) => s.sample_id).sort())
    }
  })

  // Payload contract the UI depends on.
  it('carries the display fields each row shows, with raw unknown statuses flagged', () => {
    const entries = buildEntries(corpus())
    const s5 = entries.find((e) => e.sample_id === 's5')!
    expect(s5.status).toBe('Pending')       // empty output => documented Pending default
    expect(s5.statusIsKnown).toBe(true)

    const s8 = entries.find((e) => e.sample_id === 's8')!
    expect(s8.status).toBe('Closed')        // RAW stored value, not "Unknown"
    expect(s8.statusIsKnown).toBe(false)

    const s6 = entries.find((e) => e.sample_id === 's6')!
    expect(s6.category).toBe(NO_CATEGORY_LABEL)
    expect(s6.visitCount).toBe(0)
    expect(s1(entries).party_name).toBe('Client s1')
  })
})

function s1(entries: SampleEntry[]): SampleEntry {
  return entries.find((e) => e.sample_id === 's1')!
}
```

- [ ] **Step 4: Run the tests and confirm they fail for the RIGHT reason**

```bash
npm test
```

Expected: failures are **module/type resolution** errors naming `buildEntries`,
`buildReps`, `SampleEntry`, `NO_PRODUCT_ID`, `NO_REP_ID` — i.e. "not exported". If any
failure is instead `Cannot find module '@/lib/analytics'`, the `moduleNameMapper` is
wrong; fix Step 1 before continuing.

- [ ] **Step 5: Commit**

```bash
git add jest.config.js package.json lib/__tests__/analytics-entries.test.ts
git commit -m "test: acceptance criteria for analytics entries drill-down"
```

---

## Task 2: Server side — entries payload + entryIds

**Files:**
- Modify: `lib/analytics.ts` (`RawSample` ~L63; `GroupAnalytics` ~L276; `computeGroup`
  ~L294; `buildProductsAndCategories` ~L425; new exports at end)
- Modify: `app/api/analytics/products/route.ts`
- Modify: `app/api/analytics/categories/route.ts`
- Modify: `app/api/analytics/reps/route.ts`

**Interfaces:**
- Consumes: `fetchSamplesInRange` (unchanged), `computeGroup`, `productLikeSummary`.
- Produces:
  - `type SampleEntry = { sample_id: string; party_name: string | null; product_name: string | null; category: string; sales_rep_name: string | null; location: string | null; state: string | null; sample_submission_date: string | null; status: string; statusIsKnown: boolean; visitCount: number; next_visit_date: string | null }`
  - `buildEntries(samples: RawSample[]): SampleEntry[]`
  - `buildReps(samples: RawSample[]): RepAnalytics[]`
  - `GroupAnalytics.entryIds: string[]`
  - `NO_PRODUCT_ID = '__no_product__'`, `NO_REP_ID = '__no_rep__'`

- [ ] **Step 1: Extend `RawSample`**

`sample_id` is the primary key — always present — so it is required, not optional. That
keeps `entryIds: samples.map(s => s.sample_id)` type-clean with no cast and forces test
fixtures to be realistic. Verified: no code anywhere constructs a `RawSample` literal,
so requiring it breaks nothing.

```ts
export type RawSample = {
  // Primary key. Non-null in the table, so required here: it is the id the
  // entries list and every group's entryIds are keyed on.
  sample_id: string
  party_name?: string | null
  output?: string | null
  sample_submission_date?: string | null
  next_visit_date?: string | null
  updated_at?: string | null
  location?: string | null
  state?: string | null
  // FK columns on the sample row — the grouping keys.
  product_id?: string | null
  sales_rep_id?: string | null
  // Embedded rows — used for display names and category only.
  product?: { product_id?: string | null; product_name?: string | null; category?: string | null } | null
  sales_rep?: { user_id?: string | null; user_name?: string | null } | null
  visits?: RawVisit[] | null
}
```

- [ ] **Step 2: Add the synthetic bucket ids next to the existing labels (~L82)**

```ts
// Stable synthetic ids for the "missing link" buckets. They must be non-empty:
// ProductPerformance selects a product with `setSelectedProductId(item.id || null)`,
// so a falsy id would make the bucket impossible to open. Prefixed with __ so they
// can never collide with a real UUID.
export const NO_PRODUCT_ID = '__no_product__'
export const NO_REP_ID = '__no_rep__'
```

- [ ] **Step 3: Add `entryIds` to `GroupAnalytics` and `computeGroup`**

In the `GroupAnalytics` type, after `unknownStatuses`:

```ts
  // The sample_ids in this group. Derived from the same array as totalSamples,
  // so `entryIds.length === totalSamples` holds by construction. The client
  // looks each id up in the response's top-level `entries`.
  entryIds: string[]
```

In the `computeGroup` return object, after `unknownStatuses,`:

```ts
    entryIds: samples.map((s) => s.sample_id),
```

- [ ] **Step 4: Use the synthetic product id in `buildProductsAndCategories` (~L437)**

```ts
    const productId = s.product_id || NO_PRODUCT_ID
```

- [ ] **Step 5: Add `buildEntries` and `buildReps` at the end of `lib/analytics.ts`**

```ts
// ---------------------------------------------------------------------------
// Sample entries — the audit trail behind every aggregate
// ---------------------------------------------------------------------------

// One row of the entries list. Every sample is serialised exactly ONCE at the
// top level of the response; groups reference their rows by id via `entryIds`.
// Embedding a full array per group would repeat each sample two or three times
// (once per product, per category, per rep).
export type SampleEntry = {
  sample_id: string
  party_name: string | null
  product_name: string | null
  // From the LINKED PRODUCT, exactly like the categories aggregate — never the
  // `samples.category` column, which the create form writes and which can disagree.
  category: string
  sales_rep_name: string | null
  location: string | null
  state: string | null
  sample_submission_date: string | null
  // The same normalised value computeGroup counts: an empty/missing output is
  // the documented "Pending" default, and anything else is kept RAW so a legacy
  // 'Closed' is visible instead of being relabelled.
  status: string
  statusIsKnown: boolean
  visitCount: number
  next_visit_date: string | null
}

export function buildEntries(samples: RawSample[]): SampleEntry[] {
  return samples.map((s) => {
    const status = s.output || 'Pending'
    return {
      sample_id: s.sample_id,
      party_name: s.party_name ?? null,
      product_name: s.product?.product_name || NO_PRODUCT_LABEL,
      category: s.product?.category || NO_CATEGORY_LABEL,
      sales_rep_name: s.sales_rep?.user_name || NO_REP_LABEL,
      location: s.location ?? null,
      state: s.state ?? null,
      sample_submission_date: s.sample_submission_date ?? null,
      status,
      statusIsKnown: isKnownStatus(status),
      visitCount: Array.isArray(s.visits) ? s.visits.length : 0,
      next_visit_date: s.next_visit_date ?? null,
    }
  })
}

// ---------------------------------------------------------------------------
// Reps
// ---------------------------------------------------------------------------

export type RepAnalytics = GroupAnalytics & {
  id: string
  name: string
  neglectedLead: Fraction
  bestProductCategory: NamedRate
  worstProductCategory: NamedRate
}

// Moved here verbatim from app/api/analytics/reps/route.ts so the scoping tests
// exercise the code that actually runs. Grouping key is the FK on the sample row
// (`users` has no `id` column — see the note on RawSample).
export function buildReps(samples: RawSample[]): RepAnalytics[] {
  const repsMap = new Map<string, { id: string; name: string; samples: RawSample[] }>()
  for (const sample of samples) {
    const repId = sample.sales_rep_id || NO_REP_ID
    const repName = sample.sales_rep?.user_name || NO_REP_LABEL
    if (!repsMap.has(repId)) {
      repsMap.set(repId, { id: repId, name: repName, samples: [] })
    }
    repsMap.get(repId)!.samples.push(sample)
  }

  const reps = Array.from(repsMap.values()).map((rep) => {
    const group = computeGroup(rep.samples)
    const category = bestWorstBy(rep.samples, (s) => s.product?.category || NO_CATEGORY_LABEL)
    return {
      id: rep.id,
      name: rep.name,
      ...group,
      neglectedLead: neglectedLead(rep.samples),
      bestProductCategory: category.best,
      worstProductCategory: category.worst,
    }
  })

  // Leaderboard: most successful first (one consistent number)
  reps.sort((a, b) => b.successPct - a.successPct)
  return reps
}
```

- [ ] **Step 6: Return `entries` from the products route**

```ts
import { buildEntries, buildProductsAndCategories } from '@/lib/analytics'
...
    if (samples.length === 0) {
      return NextResponse.json({ products: [], categories: [], entries: [] })
    }

    // Every sample serialised once; groups reference theirs via entryIds.
    return NextResponse.json({
      ...buildProductsAndCategories(samples),
      entries: buildEntries(samples),
    })
```

- [ ] **Step 7: Apply the identical change to the categories route**

Same two edits in `app/api/analytics/categories/route.ts` (same import, same empty-case
`entries: []`, same spread). Repeat it literally — the two routes are intentionally
symmetric.

- [ ] **Step 8: Slim the reps route down to `buildReps` + `buildEntries`**

Replace the body between the fetch and the response:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { buildEntries, buildReps } from '@/lib/analytics'
import { fetchSamplesInRange } from '@/lib/analytics-query'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // One shared fetch: excludes soft-deleted rows and pages past the
    // PostgREST 1000-row cap. See lib/analytics-query.ts.
    const samples = await fetchSamplesInRange(startDate, endDate)

    if (samples.length === 0) {
      return NextResponse.json({ reps: [], entries: [] })
    }

    // Grouping lives in lib/analytics so the entries list and the aggregates
    // can never disagree about who owns which sample.
    return NextResponse.json({ reps: buildReps(samples), entries: buildEntries(samples) })
  } catch (error) {
    console.error('Error in analytics reps route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 9: Run the tests — all green**

```bash
npm test
```

Expected: PASS, 8 tests. Then `npx tsc --noEmit` — expect exit 0.

- [ ] **Step 10: Commit**

```bash
git add lib/analytics.ts app/api/analytics
git commit -m "feat(analytics): return sample entries once per response with per-group entryIds"
```

---

## Task 3: `SampleEntriesList` + `StatusBadge` vocabulary

**Files:**
- Modify: `app/components/StatusBadge.tsx`
- Create: `app/components/analytics/SampleEntriesList.tsx`

**Interfaces:**
- Consumes: `SampleEntry`, `PLAIN_STATUS`, `STATUS_ORDER` from `@/lib/analytics`;
  `formatDate` from `@/lib/format`.
- Produces: `<SampleEntriesList entries statusFilter onClearFilter hideProduct
  hideCategory hideRep />`.

- [ ] **Step 1: Add the `vocabulary` prop to `StatusBadge`**

Default `'operational'` keeps all four existing callers byte-identical. The `'plain'`
branch reads `PLAIN_STATUS` — no second copy of the four strings — and falls back to the
RAW stored value so a legacy `Closed` is findable.

```tsx
import { PLAIN_STATUS } from '@/lib/analytics'

// ... STATUS_STYLES and DISPLAY_TEXT unchanged ...

export default function StatusBadge({
  status,
  vocabulary = 'operational',
}: {
  status?: string | null
  vocabulary?: 'operational' | 'plain'
}) {
  const style = (status && STATUS_STYLES[status]) || 'bg-gray-100 text-gray-600'
  // Analytics speaks plain language ("Said no"); /samples and the sample page
  // speak operational ("Not Interested"). Colours stay defined once, here.
  const words = vocabulary === 'plain' ? PLAIN_STATUS : DISPLAY_TEXT
  const displayText =
    (status && words[status]) ||
    // In analytics, an unrecognised stored value is shown RAW ("Closed") — the
    // whole point of surfacing these rows is that bad data can be found and fixed.
    (vocabulary === 'plain' ? status || 'Unknown' : 'Unknown')
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {displayText}
    </span>
  )
}
```

- [ ] **Step 2: Create `app/components/analytics/SampleEntriesList.tsx`**

Presentational only — no fetching, no grouping. Follows the existing `overflow-x-auto`
table pattern used by the leaderboards and `/samples`.

```tsx
'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { SampleEntry, PLAIN_STATUS, STATUS_ORDER } from '@/lib/analytics'
import { formatDate } from '@/lib/format'
import StatusBadge from '@/app/components/StatusBadge'

const FIRST_PAGE = 10

type SortKey = 'date' | 'status'

// Status sort follows the dashboard's fixed display order (good news first);
// anything unrecognised sorts last so bad data is easy to spot at the bottom.
function statusRank(status: string): number {
  const i = (STATUS_ORDER as readonly string[]).indexOf(status)
  return i === -1 ? STATUS_ORDER.length : i
}

export default function SampleEntriesList({
  entries,
  statusFilter,
  onClearFilter,
  hideProduct = false,
  hideCategory = false,
  hideRep = false,
}: {
  entries: SampleEntry[]
  statusFilter: string | null
  onClearFilter: () => void
  hideProduct?: boolean
  hideCategory?: boolean
  hideRep?: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(
    () => (statusFilter ? entries.filter((e) => e.status === statusFilter) : entries),
    [entries, statusFilter],
  )

  const sorted = useMemo(() => {
    const rows = [...filtered]
    if (sortKey === 'status') {
      rows.sort(
        (a, b) =>
          statusRank(a.status) - statusRank(b.status) ||
          (b.sample_submission_date || '').localeCompare(a.sample_submission_date || ''),
      )
    } else {
      // Newest submission first. ISO dates compare correctly as strings;
      // missing dates sort last rather than to the top.
      rows.sort((a, b) => (b.sample_submission_date || '').localeCompare(a.sample_submission_date || ''))
    }
    return rows
  }, [filtered, sortKey])

  const visible = showAll ? sorted : sorted.slice(0, FIRST_PAGE)

  if (entries.length === 0) {
    return <p className="text-sm text-gray-500">No sample entries to show.</p>
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm text-gray-500">
          Showing {visible.length} of {sorted.length} entries
          {statusFilter && (
            <>
              {' '}filtered to “{PLAIN_STATUS[statusFilter] || statusFilter}”{' '}
              <button onClick={onClearFilter} className="text-blue-600 hover:underline">
                clear
              </button>
            </>
          )}
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Sort by</span>
          <button
            onClick={() => setSortKey('date')}
            className={`px-2 py-1 rounded ${sortKey === 'date' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortKey('status')}
            className={`px-2 py-1 rounded ${sortKey === 'status' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Status
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">No entries with that status.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Client</Th>
                  {!hideProduct && <Th>Product</Th>}
                  {!hideCategory && <Th>Category</Th>}
                  {!hideRep && <Th>Sales rep</Th>}
                  <Th>Where</Th>
                  <Th>Sent on</Th>
                  <Th>Status</Th>
                  <Th>Visits</Th>
                  <Th>Next visit</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visible.map((e) => (
                  <tr key={e.sample_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Link
                        href={`/samples/${e.sample_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {e.party_name || 'Unnamed client'}
                      </Link>
                    </td>
                    {!hideProduct && <Td>{e.product_name}</Td>}
                    {!hideCategory && <Td>{e.category}</Td>}
                    {!hideRep && <Td>{e.sales_rep_name}</Td>}
                    <Td>{[e.location, e.state].filter(Boolean).join(', ') || '—'}</Td>
                    <Td>{formatDate(e.sample_submission_date)}</Td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <StatusBadge status={e.status} vocabulary="plain" />
                      {!e.statusIsKnown && (
                        <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">
                          not a current status
                        </span>
                      )}
                    </td>
                    <Td>{e.visitCount}</Td>
                    <Td>{formatDate(e.next_visit_date)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length > FIRST_PAGE && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              {showAll ? `Show first ${FIRST_PAGE}` : `Show all ${sorted.length} entries`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{children}</td>
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: exit 0. `npm test` must still pass (unchanged — these are UI files).

- [ ] **Step 4: Commit**

```bash
git add app/components/StatusBadge.tsx app/components/analytics/SampleEntriesList.tsx
git commit -m "feat(analytics): shared SampleEntriesList + plain-vocabulary StatusBadge"
```

---

## Task 4: Wire into all three panels + clickable status cards

**Files:**
- Modify: `app/components/analytics/SalesRepPerformance.tsx`
- Modify: `app/components/analytics/ProductPerformance.tsx`

**Interfaces:**
- Consumes: `SampleEntry`, `SampleEntriesList` from Task 3; `entries` / `entryIds` from
  Task 2.

**Hook-safety rule for both files:** `renderDetails()` is called *conditionally*
(`{selected ? renderDetails() : ...}`). React hooks must NOT be called inside it. Build
the `entriesById` map with `useMemo` at component top level and do the per-group
`entryIds → entries` lookup as plain synchronous code inside `renderDetails()`.

- [ ] **Step 1: `SalesRepPerformance` — state, entries map, filter reset**

```tsx
import { GroupAnalytics, Fraction, NamedRate, SampleEntry, formatPct } from '@/lib/analytics'
import SampleEntriesList from './SampleEntriesList'
import { useMemo, useState, useEffect } from 'react'

type AnalyticsResponse = {
  reps: RepData[]
  entries: SampleEntry[]
}
```

Inside the component:

```tsx
  const [entries, setEntries] = useState<SampleEntry[]>([])
  // Which status card is active. Stored value ('Not Interested'), not the label.
  const [statusFilter, setStatusFilter] = useState<string | null>(null)

  // Built once per fetch, at top level — renderDetails() is called conditionally
  // and must not contain hooks.
  const entriesById = useMemo(
    () => new Map(entries.map((e) => [e.sample_id, e])),
    [entries],
  )
```

In `fetchAnalytics`, after `setReps(data.reps)`:

```tsx
      setEntries(data.entries || [])
```

In the leaderboard row `onClick`, clear any carried-over filter:

```tsx
                  onClick={() => {
                    setSelectedRepId(rep.id)
                    setStatusFilter(null)
                  }}
```

And in the "Back to the list" button `onClick`, alongside `setSelectedRepId(null)`, add
`setStatusFilter(null)`.

- [ ] **Step 2: `SalesRepPerformance` — status cards become filter buttons**

Replace the `<div key={s.status} className="bg-gray-50 p-4 rounded-lg">` block inside
`rep.statusBreakdown.map(...)` with a button. Unfiltered appearance is identical
(`bg-gray-50 p-4 rounded-lg`); the active card gains a ring only.

```tsx
            {rep.statusBreakdown.map((s) => {
              const active = statusFilter === s.status
              return (
                <button
                  key={s.status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(active ? null : s.status)}
                  className={`bg-gray-50 p-4 rounded-lg text-left w-full transition hover:bg-gray-100 ${
                    active ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                  <p className="text-xs text-gray-500">{formatPct(s.fraction.pct)}% of samples</p>
                </button>
              )
            })}
```

- [ ] **Step 3: `SalesRepPerformance` — insert the list below the cards**

Inside `renderDetails()`, resolve the group's entries with plain code, then render the
section between the status-cards `</div>` and the `Fact` grid:

```tsx
  const renderDetails = () => {
    const rep = reps.find((r) => r.id === selectedRepId)
    if (!rep) return null

    // Read entryIds off the resolved group object — never re-derive the grouping
    // here. The server owns it; the selection key differs per tab (id for reps and
    // products, name for categories) and a local filter would silently return
    // nothing on one of them.
    const repEntries = rep.entryIds
      .map((id) => entriesById.get(id))
      .filter((e): e is SampleEntry => Boolean(e))
```

Then, after the status-cards `</div>`:

```tsx
        <div>
          <h3 className="text-lg font-bold mb-2">The samples behind these numbers</h3>
          <SampleEntriesList
            entries={repEntries}
            statusFilter={statusFilter}
            onClearFilter={() => setStatusFilter(null)}
            hideRep
          />
        </div>
```

- [ ] **Step 4: `ProductPerformance` — same wiring, both sub-tabs**

Identical changes: import `SampleEntry` + `SampleEntriesList`, add
`entries` / `statusFilter` state, `entriesById` `useMemo`, `setEntries(data.entries || [])`
in `fetchAnalytics`, `setStatusFilter(null)` in the row `onClick`, the back button, AND
both tab buttons (switching tabs must not carry a filter over). Convert the
`item.statusBreakdown.map(...)` cards to buttons exactly as in Step 2.

In `renderDetails()`, after `if (!item) return null`:

```tsx
    const itemEntries = item.entryIds
      .map((id) => entriesById.get(id))
      .filter((e): e is SampleEntry => Boolean(e))
```

And below the status cards:

```tsx
        <div>
          <h3 className="text-lg font-bold mb-2">The samples behind these numbers</h3>
          <SampleEntriesList
            entries={itemEntries}
            statusFilter={statusFilter}
            onClearFilter={() => setStatusFilter(null)}
            hideProduct={activeTab === 'products'}
            hideCategory
          />
        </div>
```

Column rationale: inside one product, both product and category are constant → hide
both. Inside one category, the category is constant → hide it, but keep the product
column (which product within the category is exactly what is worth seeing).

- [ ] **Step 5: Typecheck and test**

```bash
npx tsc --noEmit
```

Expected: exit 0, and `npm test` still passes.

- [ ] **Step 6: Commit**

```bash
git add app/components/analytics
git commit -m "feat(analytics): list sample entries in rep, product and category panels"
```

---

## Task 5: Verification

- [ ] **Step 1: Full static gate**

```bash
npm test && npx tsc --noEmit && npm run build
```

All three must succeed.

- [ ] **Step 2: Manual checks against the running app**

Start the dev server from the worktree and click through, recording what was clicked:

1. Sales rep performance → open one named rep → list holds only their samples, and the
   row count matches that rep's "Samples sent" leaderboard cell.
2. Product performance → open one product → same check.
3. Categories tab → open one category → same check.
4. Open a "No product recorded" / "No rep recorded" bucket → it opens, and lists rows.
5. Click a status card → list filters; click again → filter clears.
6. Click an entry row → lands on that exact `/samples/[sample_id]`.
7. Narrow the date range → entry counts move in step with the aggregates.
8. Resize to a phone width → the table scrolls horizontally, nothing overflows.

- [ ] **Step 3: Code review of the whole diff**

Use `superpowers:requesting-code-review` against `git diff master...HEAD`, then
`superpowers:verification-before-completion` before reporting done.

---

## Out of scope — report only, do not fix

- `buildMonthlyTrend`'s status switch ends in a bare `else b.waiting += 1`, so a legacy
  `'Closed'` row lands in the chart's amber "Waiting to hear back" block even though
  `computeGroup` keeps it out of the status cards. The comment above that `else` claims
  the opposite and is wrong too.
- `app/samples/[sample_id]/edit/page.tsx` has no category-to-product filtering, unlike
  the create form.
