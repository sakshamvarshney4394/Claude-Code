import { NextRequest, NextResponse } from 'next/server'
import {
  RawSample,
  computeGroup,
  neglectedLead,
  bestWorstBy,
  NO_REP_LABEL,
  NO_CATEGORY_LABEL,
} from '@/lib/analytics'
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
      return NextResponse.json({ reps: [] })
    }

    // Group by the FK on the sample row. `users` has no `id` column, so the
    // previous `sample.sales_rep?.id` was undefined for every row and put every
    // sample in one bucket — see the note on RawSample in lib/analytics.ts.
    const repsMap = new Map<string, { id: string; name: string; samples: RawSample[] }>()
    for (const sample of samples) {
      const repId = sample.sales_rep_id || 'unknown'
      const repName = sample.sales_rep?.user_name || NO_REP_LABEL
      if (!repsMap.has(repId)) {
        repsMap.set(repId, { id: repId, name: repName, samples: [] })
      }
      repsMap.get(repId)!.samples.push(sample)
    }

    // One shared summary per rep, plus the rep-specific extras
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

    return NextResponse.json({ reps })
  } catch (error) {
    console.error('Error in analytics reps route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
