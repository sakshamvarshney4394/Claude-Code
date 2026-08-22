import { NextRequest, NextResponse } from 'next/server'
import { buildProductsAndCategories } from '@/lib/analytics'
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
      return NextResponse.json({ products: [], categories: [] })
    }

    // All math lives in lib/analytics so every tab computes success identically.
    return NextResponse.json(buildProductsAndCategories(samples))
  } catch (error) {
    console.error('Error in analytics products route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
