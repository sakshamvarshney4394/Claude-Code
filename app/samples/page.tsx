'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import StatusBadge from '@/app/components/StatusBadge'
import { formatDate } from '@/lib/format'
import { formatSampleNumber, computeSerialMap } from '@/lib/sampleNumber'
import { Download, Plus, Search, SearchX, FilterX, Inbox } from 'lucide-react'

type Sample = {
  sample_id: string
  party_name: string
  location: string | null
  product: {
    product_name: string
    variant_name: string | null
  } | null
  sales_rep: {
    user_name: string
  } | null
  sample_submission_date: string | null
  visits: Array<{
    visit_id: string
    visit_number: number
    visit_date: string
    feedback: string | null
  }> | null
  output: string
}

export default function SamplesPage() {
  const router = useRouter()
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Client-side search + date filters (AND). Applied against already-loaded samples.
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    async function fetchSamples() {
      try {
        setLoading(true)
        const res = await fetch('/api/samples')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load samples')
        setSamples(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load samples')
      } finally {
        setLoading(false)
      }
    }

    fetchSamples()
  }, [])

  // Export current samples to an .xlsx file, client-side only.
  function handleExport() {
    const rows = samples.map(s => ({
      'Sample ID': formatSampleNumber(serialBySampleId.get(s.sample_id) ?? 0, totalCount),
      'Client Name': s.party_name,
      'Proposed Product': s.product?.product_name || '—',
      'Sales Representative': s.sales_rep?.user_name || '—',
      'Submitted': s.sample_submission_date ? new Date(s.sample_submission_date).toISOString().slice(0, 10) : '—',
      'Visits': s.visits?.length || 0,
      'Status': s.output,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Samples')
    XLSX.writeFile(wb, `samples-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // Reset both filters to their unfiltered state.
  const resetFilters = () => {
    setSearch('')
    setDateFilter('')
  }

  const hasFilters = search.trim() !== '' || dateFilter !== ''

  // Serial numbers are computed from the full creation-order list
  const { serialBySampleId, totalCount } = useMemo(
    () => computeSerialMap(samples),
    [samples]
  )

  const filteredSamples = samples.filter(s => {
    const q = search.trim().toLowerCase()
    const textMatch =
      !q ||
      s.party_name.toLowerCase().includes(q) ||
      (s.product?.product_name ?? '').toLowerCase().includes(q) ||
      (s.sales_rep?.user_name ?? '').toLowerCase().includes(q)

    const dateMatch =
      !dateFilter ||
      (s.sample_submission_date ? s.sample_submission_date.slice(0, 10) === dateFilter : false)

    return textMatch && dateMatch
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm">Loading samples...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-24 text-red-500">
        <p className="font-semibold">Failed to load samples</p>
        <p className="text-sm mt-1 opacity-80">{error}</p>
      </div>
    )
  }

  // Stats row
  const pendingCount = samples.filter(s => s.output === 'Pending').length
  const onboardCount = samples.filter(s => s.output === 'Onboard').length

  return (
    <div className="py-6 space-y-6">
      {/* Page header + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900">All Samples</h1>
          <p className="text-sm text-gray-500 mt-1">
            {samples.length} {samples.length === 1 ? 'sample' : 'samples'} tracked
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={samples.length === 0}
            className="btn btn-secondary text-sm px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-500 text-white rounded-lg p-6">
          <p className="text-sm font-medium opacity-80">Total Samples</p>
          <p className="text-3xl font-extrabold mt-1">{samples.length}</p>
        </div>
        <div className="bg-amber-500 text-white rounded-lg p-6">
          <p className="text-sm font-medium opacity-80">Response Pending</p>
          <p className="text-3xl font-extrabold mt-1">{pendingCount}</p>
        </div>
        <div className="bg-blue-500 text-white rounded-lg p-6">
          <p className="text-sm font-medium opacity-80">Onboarded Client</p>
          <p className="text-3xl font-extrabold mt-1">{onboardCount}</p>
        </div>
      </div>

      {!samples.length ? (
        <div className="text-center py-20 bg-white rounded-lg">
          <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No samples found. Create your first sample to get started.</p>
          <Link href="/samples/create" className="btn btn-primary mt-4 px-4 py-2 text-sm">
            <Plus className="w-4 h-4" />
            Create First Sample
          </Link>
        </div>
      ) : (
        <>
          {/* Search bar */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by client, product, or sales rep..."
                  aria-label="Search samples"
                  className="input pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="date-filter" className="text-sm text-gray-500 whitespace-nowrap">
                  Submitted on
                </label>
                <input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  aria-label="Filter by sample submission date"
                  className="input"
                />
              </div>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="btn btn-secondary text-sm px-3 py-2"
                >
                  <FilterX className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* No-results state */}
          {filteredSamples.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg">
              <SearchX className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No samples match your filters.</p>
              <button onClick={resetFilters} className="btn btn-secondary mt-4 px-4 py-2 text-sm">
                <FilterX className="w-4 h-4" />
                Clear filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop table (>=768px) — clicking row navigates directly to view page */}
              <div className="hidden md:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Sample ID</th>
                        <th className="px-6 py-3 font-semibold">Client Name</th>
                        <th className="px-6 py-3 font-semibold">Proposed Product</th>
                        <th className="px-6 py-3 font-semibold">Sales Representative</th>
                        <th className="px-6 py-3 font-semibold">Address</th>
                        <th className="px-6 py-3 font-semibold">Submitted</th>
                        <th className="px-6 py-3 font-semibold">Visits</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSamples.map(sample => (
                        <tr
                          key={sample.sample_id}
                          onClick={() => router.push(`/samples/${sample.sample_id}`)}
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                        >
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {formatSampleNumber(serialBySampleId.get(sample.sample_id) ?? 0, totalCount)}
                          </td>
                          <td className="px-6 py-4 text-gray-900 font-medium">{sample.party_name}</td>
                          <td className="px-6 py-4 text-gray-700">
                            {sample.product?.product_name || '—'}
                            {sample.product?.variant_name ? ` (${sample.product.variant_name})` : ''}
                          </td>
                          <td className="px-6 py-4 text-gray-700">{sample.sales_rep?.user_name || '—'}</td>
                          <td className="px-6 py-4 text-gray-700">{sample.location || '—'}</td>
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(sample.sample_submission_date)}
                          </td>
                          <td className="px-6 py-4 text-gray-600">{sample.visits?.length || 0}</td>
                          <td className="px-6 py-4"><StatusBadge status={sample.output} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile stacked cards (<768px) — clicking card navigates directly to view page */}
              <div className="md:hidden space-y-4">
                {filteredSamples.map(sample => (
                  <div
                    key={sample.sample_id}
                    onClick={() => router.push(`/samples/${sample.sample_id}`)}
                    className="card p-5 hover:border-blue-300 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{sample.party_name}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {formatSampleNumber(serialBySampleId.get(sample.sample_id) ?? 0, totalCount)}
                        </p>
                      </div>
                      <StatusBadge status={sample.output} />
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Proposed Product</dt>
                        <dd className="font-medium text-gray-900 truncate">
                          {sample.product?.product_name || '—'}
                          {sample.product?.variant_name ? ` (${sample.product.variant_name})` : ''}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Sales Representative</dt>
                        <dd className="font-medium text-gray-900">{sample.sales_rep?.user_name || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Address</dt>
                        <dd className="font-medium text-gray-900 truncate">{sample.location || '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Submitted</dt>
                        <dd className="text-gray-900">{formatDate(sample.sample_submission_date)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-gray-500">Visits</dt>
                        <dd className="text-gray-900">{sample.visits?.length || 0}</dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
