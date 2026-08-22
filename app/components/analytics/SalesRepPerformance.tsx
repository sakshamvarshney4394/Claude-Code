'use client'

import { useState, useEffect } from 'react'
import { GroupAnalytics, Fraction, NamedRate, formatPct } from '@/lib/analytics'
import MonthlyOutcomeChart from './MonthlyOutcomeChart'
import SuccessHero from './SuccessHero'

type RepData = GroupAnalytics & {
  id: string
  name: string
  neglectedLead: Fraction
  bestProductCategory: NamedRate
  worstProductCategory: NamedRate
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const res = await fetch(`/api/analytics/reps?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch analytics')

      const data: AnalyticsResponse = await res.json()
      setReps(data.reps)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeText = () => {
    if (!startDate && !endDate) return 'All time'
    if (startDate && !endDate) return `From ${new Date(startDate).toLocaleDateString()}`
    if (!startDate && endDate) return `Until ${new Date(endDate).toLocaleDateString()}`
    return `${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}`
  }

  const renderLeaderboard = () => {
    if (loading) return <div className="text-center py-8">Loading…</div>
    if (error) return <div className="text-center py-8 text-red-500">{error}</div>
    if (reps.length === 0)
      return <div className="text-center py-8 text-gray-500">No samples in this date range yet.</div>

    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Who wins the most clients</h2>
        <p className="text-sm text-gray-500 mb-4">
          Sorted by how many of their samples became clients. Tap any row for the full story.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Became clients</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Samples sent</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reps.map((rep, index) => (
                <tr
                  key={`${rep.id}-${index}`}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedRepId(rep.id)}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{index + 1}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{rep.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-24 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(rep.successPct, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums">
                        {rep.success.part} of {rep.success.whole}{' '}
                        <span className="text-gray-500">({formatPct(rep.successPct)}%)</span>
                      </span>
                      {rep.lowSampleSize && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">too few to be sure</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{rep.totalSamples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderDetails = () => {
    const rep = reps.find((r) => r.id === selectedRepId)
    if (!rep) return null

    return (
      <div className="mb-6 space-y-6">
        <h2 className="text-xl font-bold">How {rep.name} is doing</h2>

        <SuccessHero success={rep.success} inWords={rep.successInWords} lowSampleSize={rep.lowSampleSize} />

        <div>
          <h3 className="text-lg font-bold mb-2">What happened to their {rep.totalSamples} samples</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rep.statusBreakdown.map((s) => (
              <div key={s.status} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                <p className="text-xs text-gray-500">{formatPct(s.fraction.pct)}% of samples</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Fact emoji="👥" label="Visits per sample, on average" value={rep.avgVisitsPerSample} />
          <Fact
            emoji="📅"
            label="Days until the first visit, on average"
            value={rep.avgDaysToFirstVisit}
            hint="how fast they follow up"
          />
          <Fact
            emoji="⚠️"
            label="Samples never followed up"
            value={`${rep.neglectedLead.part} of ${rep.neglectedLead.whole}`}
            hint={`${formatPct(rep.neglectedLead.pct)}% got no visit at all`}
          />
          <Fact
            emoji="📦"
            label="Best product type"
            value={rep.bestProductCategory.name}
            hint={rep.bestProductCategory.fraction.text}
          />
          <Fact
            emoji="📍"
            label="Best area"
            value={rep.bestLocation.name}
            hint={rep.bestLocation.fraction.text}
          />
        </div>

        <div>
          <h3 className="text-lg font-bold mb-2">Month by month</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <MonthlyOutcomeChart data={rep.monthlyTrend} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900">Sales rep performance</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input pl-0 pr-8"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input pl-0 pr-8"
          />
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

      {(startDate || endDate) && (
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          Showing: {getDateRangeText()}
        </div>
      )}

      {renderLeaderboard()}

      {selectedRepId ? (
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => setSelectedRepId(null)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to the list
          </button>
          {renderDetails()}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Tap a sales rep above to see their full story.</p>
      )}
    </div>
  )
}

// Small plain-language fact row.
function Fact({
  emoji,
  label,
  value,
  hint,
}: {
  emoji: string
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-4">
      <span className="w-9 h-9 flex items-center justify-center bg-blue-50 rounded-full text-base shrink-0">
        {emoji}
      </span>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  )
}
