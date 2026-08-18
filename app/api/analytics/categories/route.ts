import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build Supabase query with date filtering
    let query = supabase
      .from('samples')
      .select(`
        *,
        product:products(*),
        sales_rep:users(*),
        visits:visits(*)
      `)
      .order('created_at', { ascending: false })

    // Apply date filters if provided (inclusive on both ends)
    if (startDate) {
      query = query.gte('sample_submission_date', startDate)
    }
    if (endDate) {
      query = query.lte('sample_submission_date', endDate)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Process data for category analytics
    if (!data || data.length === 0) {
      return NextResponse.json({ products: [], categories: [] })
    }

    // Group by category
    const productsMap = new Map()
    const categoriesMap = new Map()

    data.forEach(sample => {
      const productId = sample.product?.id
      const productName = sample.product?.product_name || 'Unknown Product'
      const category = sample.product?.category || 'Uncategorized'

      // Initialize product if not exists
      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          id: productId,
          name: productName,
          category,
          samples: [],
          visits: []
        })
      }

      const product = productsMap.get(productId)
      product.samples.push(sample)

      // Collect all visits for this sample
      if (sample.visits && Array.isArray(sample.visits)) {
        product.visits.push(...sample.visits)
      }

      // Initialize category if not exists
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, {
          name: category,
          samples: [],
          visits: []
        })
      }

      const categoryData = categoriesMap.get(category)
      categoryData.samples.push(sample)

      // Collect all visits for category
      if (sample.visits && Array.isArray(sample.visits)) {
        categoryData.visits.push(...sample.visits)
      }
    })

    // Process products for leaderboard (keeping original product analytics)
    const productsAnalytics = Array.from(productsMap.values()).map((product) => {
      const { samples, visits, name, category, id } = product

      const statusBreakdown = [
        { status: 'Pending', count: 0 },
        { status: 'Closed', count: 0 },
        { status: 'Onboard', count: 0 },
        { status: 'Not Interested', count: 0 },
        { status: 'Interested but need time', count: 0 }
      ]

      samples.forEach((sample: any) => {
        const status = sample.output
        if (statusBreakdown.some(s => s.status === status)) {
          const statusObj = statusBreakdown.find(s => s.status === status)
          if (statusObj) {
            statusObj.count += 1
          }
        }
      })

      const totalSamples = samples.length
      const onboardCount = statusBreakdown.find(s => s.status === 'Onboard')?.count || 0
      const conversionRate = totalSamples > 0 ? ((onboardCount / totalSamples) * 100).toFixed(1) : '0.0'

      // Average visits per sample
      const totalVisits = visits.length
      const avgVisitsPerSample = totalSamples > 0 ? (totalVisits / totalSamples).toFixed(1) : '0.0'

      // Average days from sample_submission_date to first visit
      const daysToFirstVisit = samples
        .map((sample: any) => {
          if (!sample.visits || !Array.isArray(sample.visits) || sample.visits.length === 0) {
            return null
          }
          const firstVisit = sample.visits.reduce((earliest: any, visit: any) => {
            const visitDate = new Date(visit.visit_date)
            const sampleDate = new Date(sample.sample_submission_date)
            return visitDate < earliest ? visitDate : earliest
          }, new Date(sample.visits[0].visit_date))

          const diffTime = Math.abs(firstVisit.getTime() - new Date(sample.sample_submission_date).getTime())
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        })
        .filter((val: number) => val !== null)

      const avgDaysToFirstVisit = daysToFirstVisit.length > 0
        ? (daysToFirstVisit.reduce((a: number, b: number) => a + b, 0) / daysToFirstVisit.length).toFixed(1)
        : '0.0'

      // Average days from sample_submission_date to updated_at where output = 'Onboard'
      const daysToConversion = samples
        .filter((sample: any) => sample.output === 'Onboard' && sample.updated_at)
        .map((sample: any) => {
          const diffTime = Math.abs(new Date(sample.updated_at).getTime() - new Date(sample.sample_submission_date).getTime())
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        })
        .filter((val: number) => val !== null)

      const avgDaysToConversion = daysToConversion.length > 0
        ? (daysToConversion.reduce((a: number, b: number) => a + b, 0) / daysToConversion.length).toFixed(1)
        : '0.0'

      // Location performance
      const locationStats = new Map()
      samples.forEach((sample: any) => {
        const location = sample.location || 'Unknown'
        if (!locationStats.has(location)) {
          locationStats.set(location, { samples: 0, onboard: 0 })
        }
        const loc = locationStats.get(location)
        loc.samples++
        if (sample.output === 'Onboard') loc.onboard++
      })

      // Filter locations with at least 3 samples for best/worst
      const validLocations = Array.from(locationStats.entries())
        .filter(([_, stats]) => stats.samples >= 3)
        .map(([name, stats]) => ({
          name,
          rate: stats.samples > 0 ? ((stats.onboard / stats.samples) * 100).toFixed(1) : '0.0'
        }))

      let bestLocation = { name: 'N/A', rate: '0.0%' }
      let worstLocation = { name: 'N/A', rate: '0.0%' }

      if (validLocations.length > 0) {
        bestLocation = validLocations.reduce((best, current) =>
          parseFloat(current.rate) > parseFloat(best.rate) ? current : best
        )
        worstLocation = validLocations.reduce((worst, current) =>
          parseFloat(current.rate) < parseFloat(worst.rate) ? current : worst
        )
      }

      bestLocation.rate = `${bestLocation.rate}% (${locationStats.get(bestLocation.name)?.onboard || 0}/${locationStats.get(bestLocation.name)?.samples || 0})`
      worstLocation.rate = `${worstLocation.rate}% (${locationStats.get(worstLocation.name)?.onboard || 0}/${locationStats.get(worstLocation.name)?.samples || 0})`

      // Sales rep performance
      const repStats = new Map()
      samples.forEach((sample: any) => {
        const repId = sample.sales_rep?.id || 'unknown'
        const repName = sample.sales_rep?.user_name || 'Unknown Rep'

        if (!repStats.has(repId)) {
          repStats.set(repId, { name: repName, samples: 0, onboard: 0 })
        }
        const rep = repStats.get(repId)
        rep.samples++
        if (sample.output === 'Onboard') rep.onboard++
      })

      // Filter reps with at least 3 samples for best/worst
      const validReps = Array.from(repStats.entries())
        .filter(([_, stats]) => stats.samples >= 3)
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          rate: stats.samples > 0 ? ((stats.onboard / stats.samples) * 100).toFixed(1) : '0.0'
        }))

      let bestRep = { name: 'N/A', rate: '0.0%' }
      let worstRep = { name: 'N/A', rate: '0.0%' }

      if (validReps.length > 0) {
        bestRep = validReps.reduce((best, current) =>
          parseFloat(current.rate) > parseFloat(best.rate) ? current : best
        )
        worstRep = validReps.reduce((worst, current) =>
          parseFloat(current.rate) < parseFloat(worst.rate) ? current : worst
        )
      }

      bestRep.rate = `${bestRep.rate}% (${repStats.get(bestRep.name)?.onboard || 0}/${repStats.get(bestRep.name)?.samples || 0})`
      worstRep.rate = `${worstRep.rate}% (${repStats.get(worstRep.name)?.onboard || 0}/${repStats.get(worstRep.name)?.samples || 0})`

      // Monthly trend
      const monthlyData = new Map()
      samples.forEach((sample: any) => {
        const date = new Date(sample.sample_submission_date)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { samples: 0, onboard: 0 })
        }
        const month = monthlyData.get(monthKey)
        month.samples++
        if (sample.output === 'Onboard') month.onboard++
      })

      const monthlyTrend = Array.from(monthlyData.entries())
        .map(([monthKey, stats]) => {
          const [year, month] = monthKey.split('-').map(Number)
          const date = new Date(year, month - 1)
          const conversionRate = stats.samples > 0
            ? ((stats.onboard / stats.samples) * 100)
            : 0
          return {
            month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            samplesSent: stats.samples,
            conversionRate
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA.getTime() - dateB.getTime()
        })

      return {
        id,
        name,
        category,
        totalSamples,
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s.count,
          percentage: totalSamples > 0 ? ((s.count / totalSamples) * 100).toFixed(1) : '0.0'
        })),
        conversionRate: `${conversionRate}%`,
        avgVisitsPerSample,
        avgDaysToFirstVisit,
        avgDaysToConversion: totalSamples > 0 ? `${avgDaysToConversion}` : '0.0',
        bestLocation,
        worstLocation,
        bestRep,
        worstRep,
        monthlyTrend,
        lowSampleSize: totalSamples < 3
      }
    })

    // Process categories for leaderboard
    const categoriesAnalytics = Array.from(categoriesMap.values()).map((categoryData) => {
      const { samples, visits, name } = categoryData

      const statusBreakdown = [
        { status: 'Pending', count: 0 },
        { status: 'Closed', count: 0 },
        { status: 'Onboard', count: 0 },
        { status: 'Not Interested', count: 0 },
        { status: 'Interested but need time', count: 0 }
      ]

      samples.forEach((sample: any) => {
        const status = sample.output
        if (statusBreakdown.some(s => s.status === status)) {
          const statusObj = statusBreakdown.find(s => s.status === status)
          if (statusObj) {
            statusObj.count += 1
          }
        }
      })

      const totalSamples = samples.length
      const onboardCount = statusBreakdown.find(s => s.status === 'Onboard')?.count || 0
      const conversionRate = totalSamples > 0 ? ((onboardCount / totalSamples) * 100).toFixed(1) : '0.0'

      // Average visits per sample
      const totalVisits = visits.length
      const avgVisitsPerSample = totalSamples > 0 ? (totalVisits / totalSamples).toFixed(1) : '0.0'

      // Average days from sample_submission_date to first visit
      const daysToFirstVisit = samples
        .map((sample: any) => {
          if (!sample.visits || !Array.isArray(sample.visits) || sample.visits.length === 0) {
            return null
          }
          const firstVisit = sample.visits.reduce((earliest: any, visit: any) => {
            const visitDate = new Date(visit.visit_date)
            const sampleDate = new Date(sample.sample_submission_date)
            return visitDate < earliest ? visitDate : earliest
          }, new Date(sample.visits[0].visit_date))

          const diffTime = Math.abs(firstVisit.getTime() - new Date(sample.sample_submission_date).getTime())
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        })
        .filter((val: number) => val !== null)

      const avgDaysToFirstVisit = daysToFirstVisit.length > 0
        ? (daysToFirstVisit.reduce((a: number, b: number) => a + b, 0) / daysToFirstVisit.length).toFixed(1)
        : '0.0'

      // Average days from sample_submission_date to updated_at where output = 'Onboard'
      const daysToConversion = samples
        .filter((sample: any) => sample.output === 'Onboard' && sample.updated_at)
        .map((sample: any) => {
          const diffTime = Math.abs(new Date(sample.updated_at).getTime() - new Date(sample.sample_submission_date).getTime())
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        })
        .filter((val: number) => val !== null)

      const avgDaysToConversion = daysToConversion.length > 0
        ? (daysToConversion.reduce((a: number, b: number) => a + b, 0) / daysToConversion.length).toFixed(1)
        : '0.0'

      // Location performance
      const locationStats = new Map()
      samples.forEach((sample: any) => {
        const location = sample.location || 'Unknown'
        if (!locationStats.has(location)) {
          locationStats.set(location, { samples: 0, onboard: 0 })
        }
        const loc = locationStats.get(location)
        loc.samples++
        if (sample.output === 'Onboard') loc.onboard++
      })

      // Filter locations with at least 3 samples for best/worst
      const validLocations = Array.from(locationStats.entries())
        .filter(([_, stats]) => stats.samples >= 3)
        .map(([name, stats]) => ({
          name,
          rate: stats.samples > 0 ? ((stats.onboard / stats.samples) * 100).toFixed(1) : '0.0'
        }))

      let bestLocation = { name: 'N/A', rate: '0.0%' }
      let worstLocation = { name: 'N/A', rate: '0.0%' }

      if (validLocations.length > 0) {
        bestLocation = validLocations.reduce((best, current) =>
          parseFloat(current.rate) > parseFloat(best.rate) ? current : best
        )
        worstLocation = validLocations.reduce((worst, current) =>
          parseFloat(current.rate) < parseFloat(worst.rate) ? current : worst
        )
      }

      bestLocation.rate = `${bestLocation.rate}% (${locationStats.get(bestLocation.name)?.onboard || 0}/${locationStats.get(bestLocation.name)?.samples || 0})`
      worstLocation.rate = `${worstLocation.rate}% (${locationStats.get(worstLocation.name)?.onboard || 0}/${locationStats.get(worstLocation.name)?.samples || 0})`

      // Sales rep performance
      const repStats = new Map()
      samples.forEach((sample: any) => {
        const repId = sample.sales_rep?.id || 'unknown'
        const repName = sample.sales_rep?.user_name || 'Unknown Rep'

        if (!repStats.has(repId)) {
          repStats.set(repId, { name: repName, samples: 0, onboard: 0 })
        }
        const rep = repStats.get(repId)
        rep.samples++
        if (sample.output === 'Onboard') rep.onboard++
      })

      // Filter reps with at least 3 samples for best/worst
      const validReps = Array.from(repStats.entries())
        .filter(([_, stats]) => stats.samples >= 3)
        .map(([id, stats]) => ({
          id,
          name: stats.name,
          rate: stats.samples > 0 ? ((stats.onboard / stats.samples) * 100).toFixed(1) : '0.0'
        }))

      let bestRep = { name: 'N/A', rate: '0.0%' }
      let worstRep = { name: 'N/A', rate: '0.0%' }

      if (validReps.length > 0) {
        bestRep = validReps.reduce((best, current) =>
          parseFloat(current.rate) > parseFloat(best.rate) ? current : best
        )
        worstRep = validReps.reduce((worst, current) =>
          parseFloat(current.rate) < parseFloat(worst.rate) ? current : worst
        )
      }

      bestRep.rate = `${bestRep.rate}% (${repStats.get(bestRep.name)?.onboard || 0}/${repStats.get(bestRep.name)?.samples || 0})`
      worstRep.rate = `${worstRep.rate}% (${repStats.get(worstRep.name)?.onboard || 0}/${repStats.get(worstRep.name)?.samples || 0})`

      // Monthly trend
      const monthlyData = new Map()
      samples.forEach((sample: any) => {
        const date = new Date(sample.sample_submission_date)
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { samples: 0, onboard: 0 })
        }
        const month = monthlyData.get(monthKey)
        month.samples++
        if (sample.output === 'Onboard') month.onboard++
      })

      const monthlyTrend = Array.from(monthlyData.entries())
        .map(([monthKey, stats]) => {
          const [year, month] = monthKey.split('-').map(Number)
          const date = new Date(year, month - 1)
          const conversionRate = stats.samples > 0
            ? ((stats.onboard / stats.samples) * 100)
            : 0
          return {
            month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            samplesSent: stats.samples,
            conversionRate
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA.getTime() - dateB.getTime()
        })

      return {
        name,
        totalSamples,
        statusBreakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s.count,
          percentage: totalSamples > 0 ? ((s.count / totalSamples) * 100).toFixed(1) : '0.0'
        })),
        conversionRate: `${conversionRate}%`,
        avgVisitsPerSample,
        avgDaysToFirstVisit,
        avgDaysToConversion: totalSamples > 0 ? `${avgDaysToConversion}` : '0.0',
        bestLocation,
        worstLocation,
        bestRep,
        worstRep,
        monthlyTrend,
        lowSampleSize: totalSamples < 3
      }
    })

    // Sort products by conversion rate (descending) for leaderboard
    const sortedProducts = [...productsAnalytics].sort((a, b) => {
      const rateA = parseFloat(a.conversionRate.split('%')[0]) || 0
      const rateB = parseFloat(b.conversionRate.split('%')[0]) || 0
      return rateB - rateA
    })

    // Sort categories by conversion rate (descending) for leaderboard
    const sortedCategories = [...categoriesAnalytics].sort((a, b) => {
      const rateA = parseFloat(a.conversionRate.split('%')[0]) || 0
      const rateB = parseFloat(b.conversionRate.split('%')[0]) || 0
      return rateB - rateA
    })

    return NextResponse.json({
      products: sortedProducts,
      categories: sortedCategories
    })
  } catch (error) {
    console.error('Error in analytics categories route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}