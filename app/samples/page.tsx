'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import StatusBadge from '@/app/components/StatusBadge'

export default function SamplesPage() {
  const [samples, setSamples] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSamples() {
      try {
        setLoading(true)
        // Data comes from the API route (centralized error handling; auth checks can
        // be added server-side in v2) instead of calling Supabase from the client.
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Samples</h1>
          <p className="text-sm text-gray-500 mt-1">
            {samples.length} {samples.length === 1 ? 'sample' : 'samples'} tracked
          </p>
        </div>
        <Link
          href="/samples/create"
          className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-semibold text-sm"
        >
          + Create New Sample
        </Link>
      </div>

      {!samples.length ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-500">No samples found. Create your first sample to get started.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {samples.map(sample => (
            <div
              key={sample.sample_id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-5 flex justify-between items-start gap-3 border-b border-gray-100">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">{sample.party_name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono">
                    {sample.sample_id.slice(0, 8)}
                  </p>
                </div>
                <StatusBadge status={sample.output} />
              </div>

              <div className="p-5 flex-1 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">Product</p>
                  <p className="text-gray-600 mt-0.5 truncate">
                    {sample.product?.product_name || '—'}
                    {sample.product?.variant_name ? ` (${sample.product.variant_name})` : ''}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sales Rep</p>
                  <p className="text-gray-600 mt-0.5 truncate">{sample.sales_rep?.user_name || '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Submitted</p>
                  <p className="text-gray-600 mt-0.5">
                    {sample.sample_submission_date ? new Date(sample.sample_submission_date).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Visits</p>
                  <p className="text-gray-600 mt-0.5">{sample.visits?.length || 0}</p>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <Link
                  href={`/samples/${sample.sample_id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm inline-flex items-center gap-1"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
