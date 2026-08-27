'use client'

import { useState, useEffect, useMemo } from 'react'
import { ProductLike, SampleEntry, formatPct } from '@/lib/analytics'
import MonthlyOutcomeChart from './MonthlyOutcomeChart'
import SampleEntriesList from './SampleEntriesList'
import SuccessHero from './SuccessHero'

type AnalyticsResponse = {
  products: ProductLike[]
  categories: ProductLike[]
  // Every sample in range, sent once. Each group's `entryIds` points into this.
  entries: SampleEntry[]
}

export default function ProductPerformance() {
  const [products, setProducts] = useState<ProductLike[]>([])
  const [categories, setCategories] = useState<ProductLike[]>([])
  const [entries, setEntries] = useState<SampleEntry[]>([])
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // Which status card is toggled on, or null. Lives here rather than in the list
  // so the card and the list it filters stay in sync.
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products')

  // Built at the top level, not inside renderDetails(): renderDetails is called
  // conditionally, and a hook inside it would break the rules of hooks.
  const entriesById = useMemo(() => new Map(entries.map((e) => [e.sample_id, e])), [entries])

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, activeTab])

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const endpoint =
        activeTab === 'products'
          ? `/api/analytics/products?${params.toString()}`
          : `/api/analytics/categories?${params.toString()}`

      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('Failed to fetch analytics')

      const data: AnalyticsResponse = await res.json()
      if (activeTab === 'products') {
        setProducts(data.products)
        setCategories([])
      } else {
        setCategories(data.categories)
        setProducts([])
      }
      // Both endpoints return the same entries for the same range — whichever tab
      // is active, the ids in that tab's groups resolve against this array.
      setEntries(data.entries ?? [])
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

  const data = activeTab === 'products' ? products : categories
  const noun = activeTab === 'products' ? 'product' : 'category'

  const renderLeaderboard = () => {
    const title = activeTab === 'products' ? 'Hero Product' : 'Hero Category'

    if (loading) return <div className="text-center py-8">Loading…</div>
    if (error) return <div className="text-center py-8 text-red-500">{error}</div>
    if (data.length === 0)
      return <div className="text-center py-8 text-gray-500">No samples in this date range yet.</div>

    return (
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ranked by how many samples were onboarded as clients. Tap any row for the full story.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Onboarded clients</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Samples sent</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item, index) => (
                <tr
                  key={`${item.id || item.name}-${index}`}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (activeTab === 'products') setSelectedProductId(item.id || null)
                    else setSelectedCategory(item.name)
                    // A filter set while looking at another group would silently
                    // hide most of this one's rows.
                    setStatusFilter(null)
                  }}
                >
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{index + 1}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">{item.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-24 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(item.successPct, 100)}%` }}
                        />
                      </div>
                      <span className="tabular-nums">
                        {item.success.part} of {item.success.whole}{' '}
                        <span className="text-gray-500">({formatPct(item.successPct)}%)</span>
                      </span>
                      {item.lowSampleSize && (
                        <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">too few to be sure</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{item.totalSamples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderDetails = () => {
    const item =
      activeTab === 'products'
        ? products.find((p) => p.id === selectedProductId)
        : categories.find((c) => c.name === selectedCategory)
    if (!item) return null

    // Plain code, not a hook: renderDetails() is called conditionally. Resolving
    // this group's ids against the shared entries map is what keeps the list
    // scoped to exactly the samples behind the numbers above it.
    const itemEntries = item.entryIds
      .map((id) => entriesById.get(id))
      .filter((e): e is SampleEntry => e !== undefined)

    return (
      <div className="mb-6 space-y-6">
        <h2 className="text-xl font-bold">
          How “{item.name}” is doing
        </h2>

        {/* Headline number */}
        <SuccessHero success={item.success} inWords={item.successInWords} lowSampleSize={item.lowSampleSize} />

        {/* What happened to every sample */}
        <div>
          <h3 className="text-lg font-bold mb-2">What happened to the {item.totalSamples} samples</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {item.statusBreakdown.map((s) => {
              const active = statusFilter === s.status
              return (
                // A card is now a filter toggle: click to narrow the list below to
                // just those samples, click again to clear. Styling matches the
                // previous plain div exactly when no filter is on, so the panel
                // looks unchanged until someone uses it.
                <button
                  key={s.status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatusFilter(active ? null : s.status)}
                  className={`bg-gray-50 p-4 rounded-lg text-left w-full transition hover:bg-gray-100 ${
                    active ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-gray-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                  <p className="text-xs text-gray-500">{formatPct(s.fraction.pct)}% of samples</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* The samples themselves. Inside one product's panel every row has that
            product; inside one category's panel every row has that category. */}
        <SampleEntriesList
          entries={itemEntries}
          statusFilter={statusFilter}
          onClearFilter={() => setStatusFilter(null)}
          onRowClick={() => setStatusFilter(null)}
          hideProduct={activeTab === 'products'}
          hideCategory={activeTab === 'categories'}
        />

        {/* Plain facts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Fact emoji="👥" label="Visits per sample, on average" value={item.avgVisitsPerSample} />
          <Fact emoji="📅" label="Days until the first visit, on average" value={item.avgDaysToFirstVisit} />
          <Fact
            emoji="⏱️"
            label="Days to win a client (rough guess)"
            value={item.avgDaysToConversion}
            hint="based on when the record was last updated"
          />
          <Fact
            emoji="📍"
            label="Best area"
            value={item.bestLocation.name}
            hint={item.bestLocation.fraction.text}
          />
          <Fact
            emoji="👤"
            label="Best sales rep"
            value={item.bestRep.name}
            hint={item.bestRep.fraction.text}
          />
        </div>

        {/* Month by month */}
        <div>
          <h3 className="text-lg font-bold mb-2">Month by month</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <MonthlyOutcomeChart data={item.monthlyTrend} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900">
          {activeTab === 'products' ? 'Product performance' : 'Category performance'}
        </h1>
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('products')
            setSelectedCategory(null)
            setStatusFilter(null)
          }}
          className={`${activeTab === 'products' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 text-sm font-medium`}
        >
          Products
        </button>
        <button
          onClick={() => {
            setActiveTab('categories')
            setSelectedProductId(null)
            setStatusFilter(null)
          }}
          className={`${activeTab === 'categories' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 text-sm font-medium`}
        >
          Categories
        </button>
      </div>

      {(startDate || endDate) && (
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          Showing: {getDateRangeText()}
        </div>
      )}

      {renderLeaderboard()}

      {selectedProductId || selectedCategory ? (
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={() => {
              setSelectedProductId(null)
              setSelectedCategory(null)
              setStatusFilter(null)
            }}
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to the list
          </button>
          {renderDetails()}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Tap a {noun} above to see its full story.</p>
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
