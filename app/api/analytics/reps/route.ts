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

    // Process data for sales rep analytics
    if (!data || data.length === 0) {
      return NextResponse.json({ reps: [] })
    }

    // Group by sales rep
    const repsMap = new Map()

    data.forEach(sample => {
      const repId = sample.sales_rep_id || 'unknown'
      const repName = sample.sales_rep?.user_name || 'Unknown Rep'

      // Initialize rep if not exists
      if (!repsMap.has(repId)) {
        repsMap.set(repId, {
          id: repId,
          name: repName,
          samples: [],
          visits: []
        })
      }

      const rep = repsMap.get(repId)
      rep.samples.push(sample)

      // Collect all visits for this sample
      if (sample.visits && Array.isArray(sample.visits)) {
        rep.visits.push(...sample.visits)
      }
    })

    // Calculate benchmarks for each sales rep
    const repsAnalytics = Array.from(repsMap.values()).map(rep => {
      const { samples, visits, name, id } = rep
      const totalSamples = samples.length

      if (totalSamples === 0) {
        return {
          id,
          name,
          totalSamples: 0,
          statusBreakdown: [],
          conversionRate: '0.0% (0/0)',
          avgVisitsPerSample: '0.0',
          avgDaysToFirstVisit: '0.0',
          neglectedLeadPercentage: '0.0% (0/0)',
          bestProductCategory: { name: 'N/A', rate: '0.0%' },
          worstProductCategory: { name: 'N/A', rate: '0.0%' },
          bestLocation: { name: 'N/A', rate: '0.0%' },
          worstLocation: { name: 'N/A', rate: '0.0%' },
          monthlyTrend: [],
          lowSampleSize: true
        }
      }

      // Status breakdown
      const statusCounts = {
        Pending: 0,
        Closed: 0,
        Onboard: 0,
        'Not Interested': 0,
        'Interested but need time': 0
      }

      samples.forEach(sample => {
        const status = sample.output || 'Pending'
        if (statusCounts[status] !== undefined) {
          statusCounts[status]++
        }
      })

      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: `${((count / totalSamples) * 100).toFixed(1)}% (${count}/${totalSamples})`
      }))

      // Conversion rate: Onboard / (samples where output != Pending)
      const nonPendingSamples = samples.filter(s => s.output !== 'Pending')
      const onboardCount = statusCounts.Onboard || 0
      const conversionRate = nonPendingSamples.length > 0
        ? `${((onboardCount / nonPendingSamples.length) * 100).toFixed(1)}% (${onboardCount}/${nonPendingSamples.length})`
        : '0.0% (0/0)'

      // Average visits per sample
      const totalVisits = visits.length
      const avgVisitsPerSample = totalSamples > 0
        ? (totalVisits / totalSamples).toFixed(1)
        : '0.0'

      // Average days from sample_submission_date to first visit (responsiveness)
      const daysToFirstVisit = samples
        .map(sample => {
          if (!sample.visits || !Array.isArray(sample.visits) || sample.visits.length === 0) {
            return null
          }
          const firstVisit = sample.visits.reduce((earliest, visit) => {
            const visitDate = new Date(visit.visit_date)
            const sampleDate = new Date(sample.sample_submission_date)
            return visitDate < earliest ? visitDate : earliest
          }, new Date(sample.visits[0].visit_date))

          const diffTime = Math.abs(firstVisit - new Date(sample.sample_submission_date))
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        })
        .filter(val => val !== null)

      const avgDaysToFirstVisit = daysToFirstVisit.length > 0
        ? (daysToFirstVisit.reduce((a, b) => a + b, 0) / daysToFirstVisit.length).toFixed(1)
        : '0.0'

      // Percentage of samples with zero follow-up visits (neglected-lead flag)
      const neglectedLeads = samples.filter(sample => {
        return !sample.visits || !Array.isArray(sample.visits) || sample.visits.length === 0
      }).length

      const neglectedLeadPercentage = totalSamples > 0
        ? `${((neglectedLeads / totalSamples) * 100).toFixed(1)}% (${neglectedLeads}/${totalSamples})`
        : '0.0% (0/0)'

      // Product category performance
      const categoryStats = new Map()
      samples.forEach(sample => {
        const category = sample.product?.category || 'Uncategorized'
        if (!categoryStats.has(category)) {
          categoryStats.set(category, { samples: 0, onboard: 0 })
        }
        const cat = categoryStats.get(category)
        cat.samples++
        if (sample.output === 'Onboard') cat.onboard++
      })

      // Filter categories with at least 3 samples for best/worst
      const validCategories = Array.from(categoryStats.entries())
        .filter(([_, stats]) => stats.samples >= 3)
        .map(([name, stats]) => ({
          name,
          rate: stats.samples > 0 ? ((stats.onboard / stats.samples) * 100).toFixed(1) : '0.0'
        }))

      let bestProductCategory = { name: 'N/A', rate: '0.0%' }
      let worstProductCategory = { name: 'N/A', rate: '0.0%' }

      if (validCategories.length > 0) {
        bestProductCategory = validCategories.reduce((best, current) =>
          parseFloat(current.rate) > parseFloat(best.rate) ? current : best
        )
        worstProductCategory = validCategories.reduce((worst, current) =>
          parseFloat(current.rate) < parseFloat(worst.rate) ? current : worst
        )
      }

      bestProductCategory.rate = `${bestProductCategory.rate}% (${categoryStats.get(bestProductCategory.name)?.onboard || 0}/${categoryStats.get(bestProductCategory.name)?.samples || 0})`
      worstProductCategory.rate = `${worstProductCategory.rate}% (${categoryStats.get(worstProductCategory.name)?.onboard || 0}/${categoryStats.get(worstProductCategory.name)?.samples || 0})`

      // Location performance
      const locationStats = new Map()
      samples.forEach(sample => {
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

      // Monthly trend
      const monthlyData = new Map()
      samples.forEach(sample => {
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
            ? ((stats.onboard / stats.samples) * 100).toFixed(1)
            : 0
          return {
            month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            samplesSent: stats.samples,
            conversionRate: parseFloat(conversionRate)
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA - dateB
        })

      return {
        id,
        name,
        totalSamples,
        statusBreakdown,
        conversionRate,
        avgVisitsPerSample,
        avgDaysToFirstVisit,
        neglectedLeadPercentage,
        bestProductCategory,
        worstProductCategory,
        bestLocation,
        worstLocation,
        monthlyTrend,
        lowSampleSize: totalSamples < 3
      }
    })

    // Sort reps by conversion rate (descending) for leaderboard
    const sortedReps = [...repsAnalytics].sort((a, b) => {
      const rateA = parseFloat(a.conversionRate.split('%')[0]) || 0
      const rateB = parseFloat(b.conversionRate.split('%')[0]) || 0
      return rateB - rateA
    })

    return NextResponse.json({
      reps: sortedReps
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}