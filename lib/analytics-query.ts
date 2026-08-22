// The one query every analytics route runs.
//
// Why this file exists: all three analytics routes (products, categories, reps)
// need the *same* set of samples. When the query lived inline in each route they
// drifted — none of them filtered soft-deleted rows, so analytics counted rows
// that /samples hides. Now there is exactly one fetch.
//
// Two things this guarantees that the old inline query did not:
//   1. soft-deleted samples are excluded, matching /api/samples
//   2. more than 1000 rows come back — PostgREST caps an unbounded select() at
//      1000, and because the order is created_at DESC that silently drops the
//      OLDEST samples. `.limit(n)` does not defeat the cap; paging with
//      `.range()` does.

import { supabase } from '@/lib/supabase'
import { RawSample } from '@/lib/analytics'

// PostgREST's default cap. Requesting exactly this many per page means one
// extra round-trip only when the total is an exact multiple.
const PAGE = 1000

// Backstop so a pathological response can never spin forever and hang the
// request. 50 pages = 50k samples; far beyond this dataset.
const MAX_PAGES = 50

/**
 * Every non-deleted sample, with product / rep / visits embedded.
 *
 * Date filters apply to `sample_submission_date` and are inclusive on both
 * ends — same as the original inline query.
 */
export async function fetchSamplesInRange(
  startDate?: string | null,
  endDate?: string | null,
): Promise<RawSample[]> {
  const all: RawSample[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE

    let query = supabase
      .from('samples')
      .select(`
        *,
        product:products(*),
        sales_rep:users(*),
        visits:visits(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      // Tiebreaker: created_at alone is not unique, and a non-deterministic
      // sort across pages can duplicate or skip rows at page boundaries.
      .order('sample_id', { ascending: true })
      .range(from, from + PAGE - 1)

    if (startDate) query = query.gte('sample_submission_date', startDate)
    if (endDate) query = query.lte('sample_submission_date', endDate)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break

    all.push(...(data as RawSample[]))

    // A short page means we've reached the end.
    if (data.length < PAGE) break
  }

  return all
}
