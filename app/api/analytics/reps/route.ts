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

    // Grouping lives in lib/analytics.ts (buildReps) so it can be tested against
    // the code that actually runs here, and so every group gets `entryIds` for
    // the drill-down list without this route knowing about it.
    //
    // `entries` is sent ONCE at the top level; each rep's `entryIds` points into
    // it. A sample belongs to a rep AND a product AND a category, so embedding
    // rows per group would ship each sample several times over.
    return NextResponse.json({ reps: buildReps(samples), entries: buildEntries(samples) })
  } catch (error) {
    console.error('Error in analytics reps route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
