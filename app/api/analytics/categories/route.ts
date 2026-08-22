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

    // Same shared math as the products route — the Categories tab reads the
    // `categories` array from this identical result, and resolves each group's
    // `entryIds` against the single top-level `entries` array.
    return NextResponse.json({
      ...buildProductsAndCategories(samples),
      entries: buildEntries(samples),
    })
  } catch (error) {
    console.error('Error in analytics categories route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
