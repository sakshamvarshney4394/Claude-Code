// Shared analytics math for the dashboard.
//
// Why this file exists: the three analytics routes (products, categories, reps)
// each used to compute "conversion" independently — and drifted. The products
// route divided Onboard by *non-pending* samples, while the categories route
// divided by *all* samples, so the two tabs literally disagreed. Everything now
// flows through here, so there is exactly ONE definition of success:
//
//     success = samples that became clients  /  ALL samples sent
//
// Numbers are formatted in plain language ("5 of 10 (50%)") so the UI can render
// them verbatim without re-deriving anything.

// ---------------------------------------------------------------------------
// Status vocabulary
// ---------------------------------------------------------------------------

// Stored status value -> friendly label shown to a non-technical viewer.
export const PLAIN_STATUS: Record<string, string> = {
  Onboard: 'Became clients',
  'Interested but need time': 'Still deciding',
  Pending: 'Waiting to hear back',
  'Not Interested': 'Said no',
}

// The four statuses the app can currently store. `scripts/alter-check-constraint.sql`
// dropped the legacy 'Closed' value from the CHECK constraint, but a constraint
// change does not rewrite existing rows — so a stored 'Closed' is still possible.
// It must NOT fall through into "Waiting to hear back", which would silently
// relabel a finished sample as an open one. `isKnownStatus` is how callers spot
// anything outside the four.
export function isKnownStatus(status: string): boolean {
  return status in PLAIN_STATUS
}

// Fixed display order: good news first, hard "no" last.
export const STATUS_ORDER = [
  'Onboard',
  'Interested but need time',
  'Pending',
  'Not Interested',
] as const

// ---------------------------------------------------------------------------
// Raw shapes coming back from Supabase (only the fields we read)
// ---------------------------------------------------------------------------

export type RawVisit = { visit_date?: string | null }

// Grouping keys come from the FK columns ON THE SAMPLE ROW (`product_id`,
// `sales_rep_id`), never from the embedded object.
//
// Two reasons, both learned the hard way:
//   1. The embedded tables' primary keys are `product_id` / `user_id` — there is
//      no `id` column on either. An earlier version of this file read
//      `s.product?.id`, which type-checked (every field is optional) but was
//      undefined for EVERY row, collapsing all products into one bucket and all
//      reps into one. Commit 39d5009 had already fixed this in the routes by
//      switching to the FK columns; the refactor into this file reintroduced it.
//   2. The FK column is present even when the embed does not resolve (e.g. the
//      referenced user row is soft-deleted), so grouping stays correct and only
//      the display name degrades.
export type RawSample = {
  // The primary key. Required, not optional: every row from `fetchSamplesInRange`
  // has one (the select is `*`), and the entries list uses it both as the React
  // key and as the `/samples/[sample_id]` link target. Making it optional would
  // push a `?? ''` fallback into every consumer for a case that cannot happen.
  sample_id: string
  output?: string | null
  sample_submission_date?: string | null
  updated_at?: string | null
  location?: string | null
  // Display-only fields the entries list shows. The select is already `*`, so
  // these arrive over the wire regardless — typing them just stops the component
  // from having to cast.
  party_name?: string | null
  state?: string | null
  next_visit_date?: string | null
  // The `samples.category` column, written by the create form. Typed for
  // completeness but deliberately NOT a grouping key: the categories tab groups
  // by the LINKED PRODUCT's category (`product.category`), and the two can
  // disagree. See buildProductsAndCategories.
  category?: string | null
  // FK columns on the sample row — the grouping keys.
  product_id?: string | null
  sales_rep_id?: string | null
  // Embedded rows — used for display names and category only.
  product?: { product_id?: string | null; product_name?: string | null; category?: string | null } | null
  sales_rep?: { user_id?: string | null; user_name?: string | null } | null
  visits?: RawVisit[] | null
}

// Shown when a sample has no product / no rep attached. Deliberately reads as
// missing data rather than as the name of a real product or person, so a
// non-technical viewer is not misled into thinking "Unknown" is a salesperson.
export const NO_PRODUCT_LABEL = 'No product recorded'
export const NO_REP_LABEL = 'No rep recorded'
export const NO_CATEGORY_LABEL = 'No category recorded'

// Synthetic group ids for the missing-link buckets. They must be non-empty
// strings: the details panels select with `setSelectedProductId(item.id || null)`,
// so a falsy id makes a group impossible to open — and the missing-link buckets
// are among the rows most worth inspecting. The double-underscore form cannot
// collide with a real UUID.
export const NO_PRODUCT_ID = '__no_product__'
export const NO_REP_ID = '__no_rep__'

// ---------------------------------------------------------------------------
// Fractions: one number, three readable forms
// ---------------------------------------------------------------------------

export type Fraction = {
  part: number // e.g. 5 became clients
  whole: number // e.g. 10 samples
  pct: number // 50  (precise to 1 decimal, for sorting)
  text: string // "5 of 10 (50%)"
}

export function formatPct(pct: number): string {
  // Drop the trailing ".0" so "50" reads cleaner than "50.0".
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1)
}

export function fraction(part: number, whole: number): Fraction {
  const pct = whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0
  return {
    part,
    whole,
    pct,
    text: `${part} of ${whole} (${formatPct(pct)}%)`,
  }
}

// Grandma-friendly gloss: "about 1 in 3", "half", "nearly all", "none yet".
export function oneInN(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return 'none yet'
  const ratio = part / whole
  if (ratio >= 0.95) return 'nearly all of them'
  if (ratio >= 0.45 && ratio <= 0.55) return 'about half'
  const n = Math.round(whole / part)
  return `about 1 in ${n}`
}

// ---------------------------------------------------------------------------
// Small date helpers
// ---------------------------------------------------------------------------

// Sortable "YYYY-MM" key. Returns null for unusable dates.
function monthKeyOf(value?: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// "2026-08" -> "Aug 2026"
function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleString('default', {
    month: 'short',
    year: 'numeric',
  })
}

// Every "YYYY-MM" from start..end inclusive, so the chart never skips a quiet
// month and pretends two distant months are neighbours.
function monthRange(startKey: string, endKey: string): string[] {
  const [sy, sm] = startKey.split('-').map(Number)
  const [ey, em] = endKey.split('-').map(Number)
  const out: string[] = []
  let y = sy
  let m = sm
  // Guard against pathological ranges (bad data) — cap at 240 months (20 years).
  let guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard < 240) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
    guard += 1
  }
  return out
}

function daysBetween(a: string, b: string): number {
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ---------------------------------------------------------------------------
// Monthly trend (per-status counts, zero-filled)
// ---------------------------------------------------------------------------

export type MonthPoint = {
  month: string // "Aug 2026"
  monthKey: string // "2026-08"
  samplesSent: number
  becameClients: number // Onboard
  stillDeciding: number // Interested but need time
  waiting: number // Pending
  saidNo: number // Not Interested
  successPct: number // becameClients / samplesSent * 100
}

export function buildMonthlyTrend(samples: RawSample[]): MonthPoint[] {
  const buckets = new Map<
    string,
    { samplesSent: number; becameClients: number; stillDeciding: number; waiting: number; saidNo: number }
  >()

  for (const s of samples) {
    const key = monthKeyOf(s.sample_submission_date)
    if (!key) continue
    if (!buckets.has(key)) {
      buckets.set(key, { samplesSent: 0, becameClients: 0, stillDeciding: 0, waiting: 0, saidNo: 0 })
    }
    const b = buckets.get(key)!
    b.samplesSent += 1
    // Empty/missing counts as Pending (documented app behaviour). A value that
    // is present but unrecognised — e.g. a legacy 'Closed' row — is NOT
    // silently folded into "waiting"; see countStatuses.
    const status = s.output || 'Pending'
    if (status === 'Onboard') b.becameClients += 1
    else if (status === 'Interested but need time') b.stillDeciding += 1
    else if (status === 'Not Interested') b.saidNo += 1
    else b.waiting += 1
  }

  const keys = Array.from(buckets.keys()).sort()
  if (keys.length === 0) return []

  const filled = monthRange(keys[0], keys[keys.length - 1])

  return filled.map((key) => {
    const b =
      buckets.get(key) ||
      { samplesSent: 0, becameClients: 0, stillDeciding: 0, waiting: 0, saidNo: 0 }
    return {
      month: monthLabel(key),
      monthKey: key,
      samplesSent: b.samplesSent,
      becameClients: b.becameClients,
      stillDeciding: b.stillDeciding,
      waiting: b.waiting,
      saidNo: b.saidNo,
      successPct: b.samplesSent > 0 ? Math.round((b.becameClients / b.samplesSent) * 1000) / 10 : 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Best / worst by a dimension (location, rep, category)
// ---------------------------------------------------------------------------

export type NamedRate = { name: string; fraction: Fraction }

const MIN_FOR_RANKING = 3 // fewer than this is too little to trust

// Groups samples by a display name, keeps groups with enough samples, and
// returns the highest- and lowest-success groups. Builds the fraction text from
// the carried counts (never re-looks-up by name), which kills the old
// "(0/0)" and doubled-string bugs.
export function bestWorstBy(
  samples: RawSample[],
  nameOf: (s: RawSample) => string,
): { best: NamedRate; worst: NamedRate } {
  const groups = new Map<string, { onboard: number; total: number }>()
  for (const s of samples) {
    const name = nameOf(s) || 'Unknown'
    if (!groups.has(name)) groups.set(name, { onboard: 0, total: 0 })
    const g = groups.get(name)!
    g.total += 1
    if (s.output === 'Onboard') g.onboard += 1
  }

  const ranked = Array.from(groups.entries())
    .filter(([, g]) => g.total >= MIN_FOR_RANKING)
    .map(([name, g]) => ({ name, fraction: fraction(g.onboard, g.total) }))

  const none: NamedRate = { name: 'Not enough data yet', fraction: fraction(0, 0) }
  if (ranked.length === 0) return { best: none, worst: none }

  let best = ranked[0]
  let worst = ranked[0]
  for (const r of ranked) {
    if (r.fraction.pct > best.fraction.pct) best = r
    if (r.fraction.pct < worst.fraction.pct) worst = r
  }
  return { best, worst }
}

// ---------------------------------------------------------------------------
// The shared per-group summary
// ---------------------------------------------------------------------------

export type StatusSlice = { status: string; label: string; count: number; fraction: Fraction }

export type GroupAnalytics = {
  totalSamples: number
  statusBreakdown: StatusSlice[]
  success: Fraction // becameClients / all samples — THE headline number
  successPct: number // numeric mirror of success.pct, for sorting
  successInWords: string // "about half", "about 1 in 3", ...
  avgVisitsPerSample: string
  avgDaysToFirstVisit: string
  bestLocation: NamedRate
  worstLocation: NamedRate
  monthlyTrend: MonthPoint[]
  lowSampleSize: boolean
  // Stored status values outside the four current ones (e.g. legacy 'Closed').
  // Empty in normal operation. Surfaced so bad data is visible instead of being
  // quietly counted as "Waiting to hear back".
  unknownStatuses: Array<{ status: string; count: number }>
  // The sample_ids behind every number above — the audit trail for this group.
  //
  // Ids only, never the samples themselves: a sample belongs to a product AND a
  // category AND a rep, so embedding rows here would ship each one 2-3x. The API
  // sends one top-level `entries` array and the client looks ids up in it.
  //
  // Computed here rather than by each caller because computeGroup already
  // receives exactly this group's samples, which makes
  // `entryIds.length === totalSamples` true by construction instead of a
  // convention someone has to remember.
  entryIds: string[]
}

export function computeGroup(samples: RawSample[]): GroupAnalytics {
  const totalSamples = samples.length

  // Status counts
  const counts: Record<string, number> = {
    Onboard: 0,
    'Interested but need time': 0,
    Pending: 0,
    'Not Interested': 0,
  }
  // Anything stored that isn't one of the four above.
  const unknown = new Map<string, number>()
  for (const s of samples) {
    // Missing/empty output means "not yet answered" => Pending. That is a
    // documented default, not an unknown value.
    const raw = s.output || 'Pending'
    if (isKnownStatus(raw)) {
      counts[raw] += 1
    } else {
      // Counted toward the total (so sums still reconcile) but kept out of the
      // four labelled buckets, and reported separately.
      unknown.set(raw, (unknown.get(raw) || 0) + 1)
    }
  }

  const statusBreakdown: StatusSlice[] = STATUS_ORDER.map((status) => ({
    status,
    label: PLAIN_STATUS[status] || status,
    count: counts[status],
    fraction: fraction(counts[status], totalSamples),
  }))

  const unknownStatuses = Array.from(unknown.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const onboard = counts['Onboard']
  const success = fraction(onboard, totalSamples)

  // Visits
  let totalVisits = 0
  for (const s of samples) {
    if (Array.isArray(s.visits)) totalVisits += s.visits.length
  }
  const avgVisitsPerSample = totalSamples > 0 ? (totalVisits / totalSamples).toFixed(1) : '0.0'

  // Days to first visit (only samples that were actually visited)
  const firstVisitGaps: number[] = []
  for (const s of samples) {
    if (!Array.isArray(s.visits) || s.visits.length === 0 || !s.sample_submission_date) continue
    let earliest: number | null = null
    for (const v of s.visits) {
      if (!v.visit_date) continue
      const t = new Date(v.visit_date).getTime()
      if (Number.isNaN(t)) continue
      if (earliest === null || t < earliest) earliest = t
    }
    if (earliest === null) continue
    firstVisitGaps.push(daysBetween(new Date(earliest).toISOString(), s.sample_submission_date))
  }
  const avgDaysToFirstVisit =
    firstVisitGaps.length > 0
      ? (firstVisitGaps.reduce((a, b) => a + b, 0) / firstVisitGaps.length).toFixed(1)
      : '0.0'

  const { best: bestLocation, worst: worstLocation } = bestWorstBy(
    samples,
    (s) => s.location || 'Unknown',
  )

  return {
    totalSamples,
    statusBreakdown,
    success,
    successPct: success.pct,
    successInWords: oneInN(onboard, totalSamples),
    avgVisitsPerSample,
    avgDaysToFirstVisit,
    bestLocation,
    worstLocation,
    monthlyTrend: buildMonthlyTrend(samples),
    lowSampleSize: totalSamples < MIN_FOR_RANKING,
    unknownStatuses,
    entryIds: samples.map((s) => s.sample_id),
  }
}

// Average days from submission to the record's last update, for samples that
// became clients. Approximate (uses updated_at), so the UI labels it as such.
export function avgDaysToConversion(samples: RawSample[]): string {
  const gaps: number[] = []
  for (const s of samples) {
    if (s.output === 'Onboard' && s.updated_at && s.sample_submission_date) {
      gaps.push(daysBetween(s.updated_at, s.sample_submission_date))
    }
  }
  return gaps.length > 0 ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) : '0.0'
}

// Share of samples nobody ever followed up on.
export function neglectedLead(samples: RawSample[]): Fraction {
  const neglected = samples.filter((s) => !Array.isArray(s.visits) || s.visits.length === 0).length
  return fraction(neglected, samples.length)
}

// The common summary for a product OR a category (identical fields). Both the
// products route and the categories route call this so the two tabs stay in
// lockstep. Callers add id / name / category.
export function productLikeSummary(samples: RawSample[]): GroupAnalytics & {
  avgDaysToConversion: string
  bestRep: NamedRate
  worstRep: NamedRate
} {
  const group = computeGroup(samples)
  const rep = bestWorstBy(samples, (s) => s.sales_rep?.user_name || NO_REP_LABEL)
  return {
    ...group,
    avgDaysToConversion: avgDaysToConversion(samples),
    bestRep: rep.best,
    worstRep: rep.worst,
  }
}

export type ProductLike = ReturnType<typeof productLikeSummary> & {
  id?: string
  name: string
  category?: string
}

// Group all samples into products and categories and summarise each. Both
// analytics endpoints return this exact object, so the Products tab and the
// Categories tab can never compute success differently again.
export function buildProductsAndCategories(samples: RawSample[]): {
  products: ProductLike[]
  categories: ProductLike[]
} {
  const productsMap = new Map<
    string,
    { id: string; name: string; category: string; samples: RawSample[] }
  >()
  const categoriesMap = new Map<string, { name: string; samples: RawSample[] }>()

  for (const s of samples) {
    // Group by the FK on the row, not the embed — see RawSample.
    const productId = s.product_id || NO_PRODUCT_ID
    const productName = s.product?.product_name || NO_PRODUCT_LABEL
    const category = s.product?.category || NO_CATEGORY_LABEL

    if (!productsMap.has(productId)) {
      productsMap.set(productId, { id: productId, name: productName, category, samples: [] })
    }
    productsMap.get(productId)!.samples.push(s)

    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, { name: category, samples: [] })
    }
    categoriesMap.get(category)!.samples.push(s)
  }

  const products: ProductLike[] = Array.from(productsMap.values()).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    ...productLikeSummary(p.samples),
  }))

  const categories: ProductLike[] = Array.from(categoriesMap.values()).map((c) => ({
    name: c.name,
    ...productLikeSummary(c.samples),
  }))

  products.sort((a, b) => b.successPct - a.successPct)
  categories.sort((a, b) => b.successPct - a.successPct)

  return { products, categories }
}

// ---------------------------------------------------------------------------
// Sales reps
// ---------------------------------------------------------------------------

export type RepAnalytics = GroupAnalytics & {
  id: string
  name: string
  neglectedLead: Fraction
  bestProductCategory: NamedRate
  worstProductCategory: NamedRate
}

// Group all samples by sales rep and summarise each. This grouping used to live
// inline in app/api/analytics/reps/route.ts. It moved here so it sits beside the
// product and category grouping and can be tested directly: a test that
// re-implemented rep grouping would be a second implementation, and drift
// between two implementations of "which samples belong to this rep" is exactly
// what produced three different conversion rates before this module existed.
export function buildReps(samples: RawSample[]): RepAnalytics[] {
  const repsMap = new Map<string, { id: string; name: string; samples: RawSample[] }>()

  for (const s of samples) {
    // Group by the FK on the row, not the embed — see RawSample.
    const repId = s.sales_rep_id || NO_REP_ID
    const repName = s.sales_rep?.user_name || NO_REP_LABEL
    if (!repsMap.has(repId)) repsMap.set(repId, { id: repId, name: repName, samples: [] })
    repsMap.get(repId)!.samples.push(s)
  }

  const reps: RepAnalytics[] = Array.from(repsMap.values()).map((rep) => {
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

  reps.sort((a, b) => b.successPct - a.successPct)
  return reps
}

// ---------------------------------------------------------------------------
// Entries: the individual samples behind the aggregates
// ---------------------------------------------------------------------------

// One row of the drill-down list. Flattened so the component reads fields
// directly instead of walking embeds and re-deriving labels — the derivation
// rules (FK-based grouping, the null buckets, category from the linked product)
// belong here next to the aggregates that use the same rules.
export type SampleEntry = {
  sample_id: string
  party_name: string
  product_name: string
  category: string
  sales_rep_name: string
  location: string
  state: string
  sample_submission_date: string | null
  next_visit_date: string | null
  status: string
  // Whether `status` is one of the four current values. False for legacy values
  // like 'Closed', which computeGroup keeps out of the status cards. The row
  // still renders, flagged, with its RAW stored value — the point of surfacing
  // bad data is to make it findable and fixable.
  statusIsKnown: boolean
  visitCount: number
}

// Flatten samples into display rows. Sent ONCE at the top level of each
// analytics response; groups reference them by id through `entryIds`.
export function buildEntries(samples: RawSample[]): SampleEntry[] {
  return samples.map((s) => {
    // Same normalisation as computeGroup: missing/empty output means "not yet
    // answered" => Pending, a documented default rather than an unknown value.
    const status = s.output || 'Pending'
    return {
      sample_id: s.sample_id,
      party_name: s.party_name || '—',
      product_name: s.product?.product_name || NO_PRODUCT_LABEL,
      // From the LINKED PRODUCT, matching the categories aggregate. Not the
      // `samples.category` column, which the create form writes and which can
      // disagree — a list that disagreed with the panel header above it would be
      // worse than no list.
      category: s.product?.category || NO_CATEGORY_LABEL,
      sales_rep_name: s.sales_rep?.user_name || NO_REP_LABEL,
      location: s.location || '—',
      state: s.state || '—',
      sample_submission_date: s.sample_submission_date || null,
      next_visit_date: s.next_visit_date || null,
      status,
      statusIsKnown: isKnownStatus(status),
      visitCount: Array.isArray(s.visits) ? s.visits.length : 0,
    }
  })
}

/**
 * Compares two submission dates so the newest sorts first, with missing dates
 * last. Lives here rather than in the component so it can be unit tested.
 *
 * Postgres hands back zero-padded ISO dates ('2026-08-18'), which compare
 * correctly as plain strings — but only while every year has the same number of
 * digits. This database already contains a submission date in the year 62452,
 * mistyped into a date field, so five-digit years are not hypothetical. A plain
 * string compare puts '12026-05-01' *below* '2026-05-01' because '1' < '2', and
 * the newest row in the table would be displayed as the oldest.
 *
 * Comparing length first fixes that: for zero-padded dates the only thing that
 * varies the length is the year, so a longer string is always the later year.
 */
export function compareSubmissionDateDesc(a: string | null, b: string | null): number {
  const av = a || ''
  const bv = b || ''
  if (!av && !bv) return 0
  if (!av) return 1
  if (!bv) return -1
  return bv.length - av.length || bv.localeCompare(av)
}
