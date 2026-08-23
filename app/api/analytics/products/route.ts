import { NextRequest, NextResponse } from 'next/server'
import { buildEntries, buildProductsAndCategories } from '@/lib/analytics'
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
      return NextResponse.json({ products: [], categories: [], entries: [] })
    }

    // All math lives in lib/analytics so every tab computes success identically.
    //
    // `entries` is sent ONCE at the top level; each group's `entryIds` points into
    // it. Every sample here belongs to a product AND a category, so embedding rows
    // per group would ship each one twice.
    return NextResponse.json({
      ...buildProductsAndCategories(samples),
      entries: buildEntries(samples),
    })
  } catch (error) {
    console.error('Error in analytics products route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
