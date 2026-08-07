'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import StatusBadge from '@/app/components/StatusBadge'
import { Plus, Trash2, Eye, ArrowRight, Inbox } from 'lucide-react'

type Sample = {
  sample_id: string;
  party_name: string;
  product: {
    product_name: string;
    variant_name: string | null;
  } | null;
  sales_rep: {
    user_name: string;
  } | null;
  sample_submission_date: string | null;
  visits: Array<{
    visit_id: string;
    visit_number: number;
    visit_date: string;
    feedback: string | null;
  }> | null;
  output: string;
}

export default function SamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false) // For clearing in-progress state
  const [clearError, setClearError] = useState<string | null>(null) // For clear operation errors

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

  // Handle clearing all samples and visits
  async function handleClearAll() {
    const sampleCount = samples.length
    if (!window.confirm(`Delete all ${sampleCount} samples and their visits? This cannot be undone.`)) {
      return
    }

    setClearing(true)
    setClearError(null)

    try {
      const res = await fetch('/api/samples', {
        method: 'DELETE',
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to clear data')
      }

      // Reload the samples list to reflect the cleared state
      setSamples([])
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Failed to clear data')
    } finally {
      setClearing(false)
    }
  }

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

  // Stats row (colour-blocked, flat)
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
          {samples.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="btn btn-danger text-sm px-4 py-2"
            >
              {clearing ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-4 h-4 border-2 border-white border-t-white rounded-full animate-spin" />
                  Clearing...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  Clear All Data
                </span>
              )}
            </button>
          )}
          <Link href="/samples/create" className="btn btn-primary text-sm px-4 py-2">
            <Plus className="w-4 h-4" />
            New Sample
          </Link>
        </div>
      </div>

      {clearError && (
        <div className="bg-rose-100 border-2 border-rose-400 text-rose-800 px-4 py-3 rounded-md">
          <p className="font-medium">Failed to clear data</p>
          <p className="text-sm">{clearError}</p>
        </div>
      )}

      {/* Stats cards — flat colour blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-500 text-white rounded-lg p-6">
          <p className="text-sm font-medium opacity-80">Total Samples</p>
          <p className="text-3xl font-extrabold mt-1">{samples.length}</p>
        </div>
        <div className="bg-amber-500 text-white rounded-lg p-6">
          <p className="text-sm font-medium opacity-80">Pending</p>
          <p className="text-3xl font-extrabold mt-1">{pendingCount}</p>
        </div>
        <div className="bg-blue-500 text-white rounded-lg p-6">
          <p className="text-sm font-medium opacity-80">Onboard</p>
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
          {/* Desktop table (>=768px) */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Sample ID</th>
                    <th className="px-6 py-3 font-semibold">Party Name</th>
                    <th className="px-6 py-3 font-semibold">Product</th>
                    <th className="px-6 py-3 font-semibold">Sales Rep</th>
                    <th className="px-6 py-3 font-semibold">Submitted</th>
                    <th className="px-6 py-3 font-semibold">Visits</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {samples.map(sample => (
                    <tr key={sample.sample_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{sample.sample_id.slice(0, 8)}</td>
                      <td className="px-6 py-4 text-gray-700">{sample.party_name}</td>
                      <td className="px-6 py-4 text-gray-700">
                        {sample.product?.product_name || '—'}
                        {sample.product?.variant_name ? ` (${sample.product.variant_name})` : ''}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{sample.sales_rep?.user_name || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {sample.sample_submission_date ? new Date(sample.sample_submission_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{sample.visits?.length || 0}</td>
                      <td className="px-6 py-4"><StatusBadge status={sample.output} /></td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/samples/${sample.sample_id}`}
                          className="inline-flex items-center gap-1 font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile stacked cards (<768px) */}
          <div className="md:hidden space-y-4">
            {samples.map(sample => (
              <Link
                key={sample.sample_id}
                href={`/samples/${sample.sample_id}`}
                className="card block p-5 group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{sample.party_name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{sample.sample_id.slice(0, 8)}</p>
                  </div>
                  <StatusBadge status={sample.output} />
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Product</dt>
                    <dd className="font-medium text-gray-900 truncate">
                      {sample.product?.product_name || '—'}
                      {sample.product?.variant_name ? ` (${sample.product.variant_name})` : ''}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Sales Rep</dt>
                    <dd className="font-medium text-gray-900">{sample.sales_rep?.user_name || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Submitted</dt>
                    <dd className="text-gray-900">
                      {sample.sample_submission_date ? new Date(sample.sample_submission_date).toLocaleDateString() : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Visits</dt>
                    <dd className="text-gray-900">{sample.visits?.length || 0}</dd>
                  </div>
                </dl>
                <span className="inline-flex items-center gap-1 font-semibold text-blue-500 mt-3 group-hover:text-blue-600 transition-colors">
                  View Details
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}