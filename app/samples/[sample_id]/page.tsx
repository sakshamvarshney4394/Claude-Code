'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'

export default function SampleDetailPage() {
  const { sample_id } = useParams<{ sample_id: string }>()
  const router = useRouter()

  const [sample, setSample] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Shared loader: fetch one sample with its joins from the API route.
  // (product:products(*) and sales_rep:users(*) resolve because product_id /
  //  sales_rep_id hold real UUIDs that match seeded rows.)
  const loadSample = async (id: string) => {
    const res = await fetch(`/api/samples/${id}`)
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed to load sample')
    return json.data
  }

  // Fetch sample data
  useEffect(() => {
    if (!sample_id) return

    const fetchSample = async () => {
      try {
        setLoading(true)
        const data = await loadSample(sample_id)
        setSample(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sample')
        if (err instanceof Error && err.message.includes('not found')) {
          router.push('/samples')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSample()
  }, [sample_id, router])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-sm">Loading sample...</p>
      </div>
    )
  }
  if (error) return <div className="text-center py-24 text-red-500">{error}</div>
  if (!sample) return <div className="text-center py-24 text-gray-500">No sample found</div>

  // Handle status update — PUT /api/samples/:id (clears next_visit_date on final outcomes)
  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/samples/${sample_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ output: newStatus })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update status')

      // Reload so the joined product / sales_rep / visits stay fresh.
      setSample(await loadSample(sample_id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  // Handle adding a visit
  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault()

    const visitDateInput = document.getElementById('visit-date') as HTMLInputElement | null
    const feedbackInput = document.getElementById('visit-feedback') as HTMLTextAreaElement | null

    if (!visitDateInput || !feedbackInput) {
      setError('Form elements not found')
      return
    }

    const visitDate = visitDateInput.value
    const feedback = feedbackInput.value

    if (!visitDate) {
      setError('Please enter a visit date')
      return
    }

    try {
      // POST /api/visits computes the next visit_number server-side.
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_id,
          visit_date: visitDate,
          feedback: feedback || null
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add visit')

      // Reset form, then reload to show the new visit.
      visitDateInput.value = ''
      feedbackInput.value = ''

      setSample(await loadSample(sample_id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const infoRow = (label: string, value: string) => (
    <div className="py-2.5 flex justify-between items-start gap-4 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/samples" className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to All Samples
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{sample.party_name}</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{sample.sample_id}</p>
        </div>
        <StatusBadge status={sample.output} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">📦</span> Product
          </h3>
          <div>
            {infoRow('Product', sample.product?.product_name || '—')}
            {infoRow('Variant', sample.product?.variant_name || 'N/A')}
            {infoRow('Category', sample.category || '—')}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🤝</span> Sales
          </h3>
          <div>
            {infoRow('Sales Rep', sample.sales_rep?.user_name || '—')}
            {infoRow('Role', sample.sales_rep?.role || '—')}
            {infoRow('Submitted', sample.sample_submission_date ? new Date(sample.sample_submission_date).toLocaleDateString() : '—')}
            {infoRow('Location', sample.location || 'Not specified')}
            {infoRow('Next Visit', sample.next_visit_date ? new Date(sample.next_visit_date).toLocaleDateString() : 'None scheduled')}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">📊</span> Status
          </h3>
          <div className="mb-4">
            <StatusBadge status={sample.output} />
          </div>
          <label className="block text-sm font-medium mb-2">Update Status</label>
          <select
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            defaultValue={sample.output}
            onChange={(e) => handleUpdateStatus(e.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="Onboard">Onboard</option>
            <option value="Closed">Closed</option>
            <option value="Not Interested">Not Interested</option>
            <option value="Interested but need time">Interested but need time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Follow-up Visits</h2>
          </div>

          {!sample.visits || sample.visits.length === 0 ? (
            <p className="text-gray-500 p-6">No visits recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {sample.visits.map((visit: any) => (
                <div key={visit.visit_id} className="px-6 py-4">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-900 text-sm bg-gray-100 rounded-md px-2 py-0.5">
                      Visit #{visit.visit_number}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(visit.visit_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-700 text-sm">{visit.feedback || 'No feedback provided'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Add Follow-up Visit</h2>
          </div>
          <form className="p-6 space-y-4" onSubmit={handleAddVisit}>
            <div>
              <label className="block text-sm font-medium mb-2">Visit Date *</label>
              <input
                type="date"
                id="visit-date"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Feedback (Notes)</label>
              <textarea
                id="visit-feedback"
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors font-semibold"
            >
              Add Visit
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}