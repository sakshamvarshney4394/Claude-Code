'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import StatusBadge from '@/app/components/StatusBadge'
import { formatDate } from '@/lib/format'

type RepData = {
  id: string
  name: string
  totalSamples: number
  statusBreakdown: Array<{
    status: string
    count: number
    percentage: string
  }>
  conversionRate: string
  avgVisitsPerSample: string
  avgDaysToFirstVisit: string
  neglectedLeadPercentage: string
  bestProductCategory: { name: string; rate: string }
  worstProductCategory: { name: string; rate: string }
  bestLocation: { name: string; rate: string }
  worstLocation: { name: string; rate: string }
  monthlyTrend: Array<{
    month: string
    samplesSent: number
    conversionRate: number
  }>
  lowSampleSize: boolean
}

type AnalyticsResponse = {
  reps: RepData[]
}

export default function SalesRepPerformance() {
  const [reps, setReps] = useState<RepData[]>([])
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [startDate, endDate])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/analytics/reps?${params.toString()}`)

      if (!res.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data: AnalyticsResponse = await res.json()
      setReps(data.reps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (type: 'start' | 'end', dateString: string) => {
    if (type === 'start') {
      setStartDate(dateString)
    } else {
      setEndDate(dateString)
    }
  }

  const getDateRangeText = () => {
    if (!startDate && !endDate) return 'All Time'
    if (startDate && !endDate) return `From ${new Date(startDate).toLocaleDateString()}`
    if (!startDate && endDate) return `Until ${new Date(endDate).toLocaleDateString()}`
    return `${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}`
  }

  const renderLeaderboard = () => {
    if (loading) return <div className="text-center py-8">Loading...</div>
    if (error) return <div className="text-center py-8 text-red-500">{error}</div>
    if (reps.length === 0) return <div className="text-center py-8">No data available for the selected date range.</div>

    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Sales Rep Performance Leaderboard</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Samples
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reps.map((rep, index) => (
                <tr key={`${rep.id}-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {rep.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {rep.conversionRate}
                    {rep.lowSampleSize && <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Low sample size (n={rep.totalSamples})</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {rep.totalSamples}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {rep.statusBreakdown.find(b => b.status === 'Onboard')?.percentage || '0.0% (0/0)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reps.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Click on a row to view detailed performance metrics
            </p>
          </div>
        )}
      </div>
    )
  }

  const renderDetails = () => {
    const rep = reps.find(r => r.id === selectedRepId)

    if (!rep) return null

    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">
          Sales Rep Details:
          <span className="font-normal">{rep.name}</span>
        </h2>

        {/* Status Breakdown */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">Status Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {rep.statusBreakdown.map(status => (
              <div key={status.status} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500 mb-1">{status.status}</p>
                <p className="text-2xl font-bold text-gray-900">{status.percentage}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-bold mb-2">Visits & Engagement</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">
                  👥
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Visits per Sample</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.avgVisitsPerSample}
                    {rep.lowSampleSize && <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 py-0 rounded">Low sample size</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">
                  📅
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Days to First Visit (Responsiveness)</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.avgDaysToFirstVisit}
                    {rep.lowSampleSize && <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 py-0 rounded">Low sample size</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-2">Conversion & Quality Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">
                  🎯
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.conversionRate}
                    {rep.lowSampleSize && <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 py-0 rounded">Low sample size</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">
                  ⚠️
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Neglected Lead %</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.neglectedLeadPercentage}
                    {rep.lowSampleSize && <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 py-0 rounded">Low sample size</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">
                  📦
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Best Product Category</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.bestProductCategory.name} ({rep.bestProductCategory.rate})
                    {rep.lowSampleSize && <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 py-0 rounded">Low sample size</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs">
                  📍
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-500">Best Location</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {rep.bestLocation.name} ({rep.bestLocation.rate})
                    {rep.lowSampleSize && <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1 py-0 rounded">Low sample size</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Trend Chart Placeholder */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-2">Monthly Trend</h3>
          <div className="bg-gray-50 p-6 rounded-lg">
            <p className="text-center text-gray-500">
              [Chart would go here - using recharts for trend lines]
              <br />
              Samples sent and conversion rate over time
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900">
            Sales Rep Performance
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-56">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="input pl-0 pr-8"
              placeholder="Start date"
            />
          </div>
          <span className="text-gray-400">to</span>
          <div className="relative flex-1 min-w-56">
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="input pl-0 pr-8"
              placeholder="End date"
            />
          </div>
          <button
            onClick={() => {
              setStartDate('')
              setEndDate('')
            }}
            className="btn btn-secondary text-sm px-3 py-2"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Date Range Info */}
      { (startDate || endDate) && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          Active date range: {getDateRangeText()}
        </div>
      )}

      {/* Leaderboard */}
      {renderLeaderboard()}

      {/* Details Panel */}
      {selectedRepId ? (
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => setSelectedRepId(null)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Leaderboard
          </button>
          {renderDetails()}
        </div>
      ) : null}
    </div>
  )
}