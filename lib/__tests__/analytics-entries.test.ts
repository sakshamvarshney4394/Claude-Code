// Acceptance tests for the analytics entries drill-down.
//
// The entries list is the audit trail behind every aggregate on the dashboard.
// If the list and the headline number disagree, one of them is lying — so these
// tests assert that they are derived from the same array and can't drift.
//
// Pure-function tests only: no DOM, no React rendering, no Supabase mocks. The
// date-range filtering lives upstream in fetchSamplesInRange and is deliberately
// not mocked here; see the criterion-5 test for how range parity is proven
// structurally instead.

import {
  RawSample,
  SampleEntry,
  buildEntries,
  buildProductsAndCategories,
  buildReps,
  isKnownStatus,
  NO_CATEGORY_LABEL,
  NO_PRODUCT_ID,
  NO_PRODUCT_LABEL,
  NO_REP_ID,
  NO_REP_LABEL,
} from '@/lib/analytics'

// A deliberately awkward corpus: two products sharing a category, a third in
// another category, a null-product row, a null-rep row, an empty output (the
// documented Pending default) and a legacy 'Closed' (a retired status).
function mk(
  id: string,
  productId: string | null,
  productName: string | null,
  category: string | null,
  repId: string | null,
  repName: string | null,
  output: string | null,
): RawSample {
  return {
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
  }
}

function corpus(): RawSample[] {
  return [
    mk('s1', 'p1', 'Collagen A', 'Collagen', 'r1', 'Rep One', 'Onboard'),
    mk('s2', 'p1', 'Collagen A', 'Collagen', 'r1', 'Rep One', 'Not Interested'),
    mk('s3', 'p2', 'Collagen B', 'Collagen', 'r2', 'Rep Two', 'Pending'),
    mk('s4', 'p3', 'Casing X', 'Casings', 'r1', 'Rep One', 'Interested but need time'),
    mk('s5', 'p3', 'Casing X', 'Casings', 'r2', 'Rep Two', ''), // empty => Pending default
    mk('s6', null, null, null, 'r1', 'Rep One', 'Onboard'), // no product recorded
    mk('s7', 'p1', 'Collagen A', 'Collagen', null, null, 'Onboard'), // no rep recorded
    mk('s8', 'p2', 'Collagen B', 'Collagen', 'r2', 'Rep Two', 'Closed'), // retired status
  ]
}

const rawById = (samples: RawSample[]) => new Map(samples.map((s) => [s.sample_id, s]))
const ids = (xs: { sample_id: string }[]) => xs.map((x) => x.sample_id).sort()

describe('analytics entries', () => {
  // Criterion 1
  it('gives every group an entryIds list whose length equals totalSamples', () => {
    const samples = corpus()
    const { products, categories } = buildProductsAndCategories(samples)
    const reps = buildReps(samples)

    expect(products.length).toBeGreaterThan(1)
    expect(categories.length).toBeGreaterThan(1)
    expect(reps.length).toBeGreaterThan(1)

    for (const g of [...products, ...categories, ...reps]) {
      expect(g.entryIds).toHaveLength(g.totalSamples)
    }
  })

  // Criterion 2
  it('reproduces statusBreakdown by counting entries, with unknowns as the gap', () => {
    const samples = corpus()
    const entryById = new Map(buildEntries(samples).map((e) => [e.sample_id, e]))
    const { products, categories } = buildProductsAndCategories(samples)

    for (const group of [...products, ...categories]) {
      const groupEntries = group.entryIds.map((id) => entryById.get(id) as SampleEntry)

      for (const slice of group.statusBreakdown) {
        const counted = groupEntries.filter((e) => e.status === slice.status).length
        expect(counted).toBe(slice.count)
      }

      const cardTotal = group.statusBreakdown.reduce((n, s) => n + s.count, 0)
      const unrecognised = groupEntries.filter((e) => !isKnownStatus(e.status)).length
      expect(group.totalSamples - cardTotal).toBe(unrecognised)
    }
  })

  it('flags exactly the entries the aggregates report as unknown statuses', () => {
    const samples = corpus()
    const entryById = new Map(buildEntries(samples).map((e) => [e.sample_id, e]))
    const { products } = buildProductsAndCategories(samples)

    for (const group of products) {
      const flagged = group.entryIds
        .map((id) => entryById.get(id) as SampleEntry)
        .filter((e) => !e.statusIsKnown)
      const reported = group.unknownStatuses.reduce((n, u) => n + u.count, 0)
      expect(flagged).toHaveLength(reported)
      // statusIsKnown must agree with the shared predicate, not a second copy.
      for (const e of flagged) expect(isKnownStatus(e.status)).toBe(false)
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
    expect(noProduct[0].name).toBe(NO_PRODUCT_LABEL)

    const noCategory = categories.filter((c) => c.entryIds.includes('s6'))
    expect(noCategory).toHaveLength(1)
    expect(noCategory[0].name).toBe(NO_CATEGORY_LABEL)

    const noRep = reps.filter((r) => r.entryIds.includes('s7'))
    expect(noRep).toHaveLength(1)
    expect(noRep[0].id).toBe(NO_REP_ID)
    expect(noRep[0].name).toBe(NO_REP_LABEL)
  })

  it('gives the null-FK buckets a non-empty id so the details panel can open them', () => {
    // ProductPerformance selects with `setSelectedProductId(item.id || null)`, so a
    // falsy id makes a group impossible to open — and the missing-link buckets are
    // the rows most worth inspecting.
    const { products } = buildProductsAndCategories(corpus())
    for (const p of products) expect(p.id).toBeTruthy()
    for (const r of buildReps(corpus())) expect(r.id).toBeTruthy()
  })

  // Criterion 5 — entries and aggregates consume ONE array, so whatever date range
  // fetchSamplesInRange applied upstream lands on both identically. Proving that
  // structurally is stronger than mocking the query.
  it('derives entries from the same array the aggregates consume', () => {
    const samples = corpus()
    const inRange = samples.filter((s) => s.sample_id !== 's8') // stand-in for a range cut

    const entries = buildEntries(inRange)
    const { products, categories } = buildProductsAndCategories(inRange)
    const reps = buildReps(inRange)

    expect(ids(entries)).toEqual(ids(inRange))
    expect(entries.some((e) => e.sample_id === 's8')).toBe(false)

    for (const groups of [products, categories, reps]) {
      expect(groups.flatMap((g) => g.entryIds).sort()).toEqual(ids(inRange))
    }
  })

  // Criterion 6
  it('resolves every entryId to exactly one entry and orphans none', () => {
    const samples = corpus()
    const entries = buildEntries(samples)
    const { products, categories } = buildProductsAndCategories(samples)
    const reps = buildReps(samples)

    const allIds = entries.map((e) => e.sample_id)
    expect(new Set(allIds).size).toBe(allIds.length)

    for (const groups of [products, categories, reps]) {
      for (const g of groups) {
        for (const id of g.entryIds) {
          expect(allIds.filter((x) => x === id)).toHaveLength(1)
        }
      }
      // No top-level entry is orphaned: every dimension covers the whole corpus.
      expect(new Set(groups.flatMap((g) => g.entryIds))).toEqual(new Set(allIds))
    }
  })

  // Criterion 7 — SCOPING. No leakage in either direction.
  it('attributes every product entry to the right product and misses none', () => {
    const samples = corpus()
    const raw = rawById(samples)
    const { products } = buildProductsAndCategories(samples)

    for (const p of products) {
      for (const id of p.entryIds) {
        expect(raw.get(id)!.product_id || NO_PRODUCT_ID).toBe(p.id)
      }
      const expected = samples.filter((s) => (s.product_id || NO_PRODUCT_ID) === p.id)
      expect([...p.entryIds].sort()).toEqual(ids(expected))
    }
  })

  it('attributes every rep entry to the right rep and misses none', () => {
    const samples = corpus()
    const raw = rawById(samples)
    const reps = buildReps(samples)

    for (const r of reps) {
      for (const id of r.entryIds) {
        expect(raw.get(id)!.sales_rep_id || NO_REP_ID).toBe(r.id)
      }
      const expected = samples.filter((s) => (s.sales_rep_id || NO_REP_ID) === r.id)
      expect([...r.entryIds].sort()).toEqual(ids(expected))
    }
  })

  it('attributes every category entry by the LINKED PRODUCT category and misses none', () => {
    const samples = corpus()
    const raw = rawById(samples)
    const { categories } = buildProductsAndCategories(samples)

    for (const c of categories) {
      for (const id of c.entryIds) {
        expect(raw.get(id)!.product?.category || NO_CATEGORY_LABEL).toBe(c.name)
      }
      const expected = samples.filter((s) => (s.product?.category || NO_CATEGORY_LABEL) === c.name)
      expect([...c.entryIds].sort()).toEqual(ids(expected))
    }
  })

  it('takes an entry category from the linked product, not the samples.category column', () => {
    // The create form writes samples.category; the categories aggregate groups by
    // product.category. They can disagree, and the list must match the aggregate
    // above it or it contradicts its own header.
    const disagreeing: RawSample = {
      ...mk('s9', 'p9', 'Product Nine', 'Collagen', 'r1', 'Rep One', 'Onboard'),
      category: 'Casings', // stale value on the sample row
    }
    const [entry] = buildEntries([disagreeing])
    expect(entry.category).toBe('Collagen')

    const { categories } = buildProductsAndCategories([disagreeing])
    expect(categories.map((c) => c.name)).toEqual(['Collagen'])
  })

  // The payload contract each row renders.
  it('carries the display fields a row shows, with raw unknown statuses preserved', () => {
    const entries = buildEntries(corpus())
    const byId = new Map(entries.map((e) => [e.sample_id, e]))

    const s1 = byId.get('s1')!
    expect(s1.party_name).toBe('Client s1')
    expect(s1.product_name).toBe('Collagen A')
    expect(s1.category).toBe('Collagen')
    expect(s1.sales_rep_name).toBe('Rep One')
    expect(s1.location).toBe('Pune')
    expect(s1.state).toBe('Maharashtra')
    expect(s1.sample_submission_date).toBe('2026-05-01')
    expect(s1.next_visit_date).toBeNull()

    // Empty output is the documented Pending default, not an unknown value.
    const s5 = byId.get('s5')!
    expect(s5.status).toBe('Pending')
    expect(s5.statusIsKnown).toBe(true)

    // A retired status keeps its RAW stored value so the bad row can be found.
    const s8 = byId.get('s8')!
    expect(s8.status).toBe('Closed')
    expect(s8.statusIsKnown).toBe(false)

    // Missing links read as missing data, never as the name of a real thing.
    const s6 = byId.get('s6')!
    expect(s6.product_name).toBe(NO_PRODUCT_LABEL)
    expect(s6.category).toBe(NO_CATEGORY_LABEL)
    expect(byId.get('s7')!.sales_rep_name).toBe(NO_REP_LABEL)
  })

  it('counts visits per entry', () => {
    const withVisits: RawSample = {
      ...mk('s10', 'p1', 'Collagen A', 'Collagen', 'r1', 'Rep One', 'Pending'),
      visits: [{ visit_date: '2026-05-02' }, { visit_date: '2026-05-09' }],
    }
    const noVisitsArray: RawSample = {
      ...mk('s11', 'p1', 'Collagen A', 'Collagen', 'r1', 'Rep One', 'Pending'),
      visits: null,
    }
    const [a, b] = buildEntries([withVisits, noVisitsArray])
    expect(a.visitCount).toBe(2)
    expect(b.visitCount).toBe(0)
  })

  it('handles an empty corpus without inventing groups or entries', () => {
    const { products, categories } = buildProductsAndCategories([])
    expect(products).toEqual([])
    expect(categories).toEqual([])
    expect(buildReps([])).toEqual([])
    expect(buildEntries([])).toEqual([])
  })
})
