'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import { formatDate } from '@/lib/format'
import { formatSampleNumber, computeSerialMap } from '@/lib/sampleNumber'
import { Package, UserRound, Activity, Pencil, Trash2 } from 'lucide-react'

export default function SampleDetailPage() {
  const { sample_id } = useParams<{ sample_id: string }>()
  const router = useRouter()

  const [sample, setSample] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Display-only sequential sample number + total count
  const [serialNumber, setSerialNumber] = useState<number | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Shared loader: fetch one sample with its joins from the API route.
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

  // Compute this sample's display serial number + total count
  useEffect(() => {
    if (!sample_id) return
    let aborted = false
    const compute = async () => {
      try {
        const res = await fetch('/api/samples')
        if (!res.ok) return
        const json = await res.json()
        const all = json.data || []
        const { serialBySampleId, totalCount: total } = computeSerialMap(all)
        if (aborted) return
        setSerialNumber(serialBySampleId.get(sample_id) ?? null)
        setTotalCount(total)
      } catch {
        // Non-fatal
      }
    }
    compute()
    return () => {
      aborted = true
    }
  }, [sample_id])

  // Delete sample and its visits
  const handleDelete = async () => {
    if (!window.confirm('Delete this sample and all its visit history? This cannot be undone.')) {
      return
    }

    try {
      setDeleting(true)
      const res = await fetch(`/api/samples/${sample_id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete sample')
      router.push('/samples')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sample')
      setDeleting(false)
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
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_id,
          visit_date: visitDate,
          feedback: feedback || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add visit')

      visitDateInput.value = ''
      feedbackInput.value = ''

      setSample(await loadSample(sample_id))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

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

  const infoRow = (label: string, value: string) => (
    <div className="py-2.5 flex justify-between items-start gap-4 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )

  return (
    <div className="py-6 space-y-6">
      {/* Page header with exactly Edit and Delete action buttons */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/samples" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to All Samples
            </Link>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900 mt-1">{sample.party_name}</h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {serialNumber ? `Sample #${formatSampleNumber(serialNumber, totalCount)}` : sample.sample_id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={sample.output} />
            <Link
              href={`/samples/${sample_id}/edit`}
              className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-gray-100 text-blue-500 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </span>
            Product
          </h3>
          <div>
            {infoRow('Proposed Product', sample.product?.product_name || '—')}
            {infoRow('Category', sample.category || '—')}
            {infoRow('POC Category', sample.poc_category || '—')}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-gray-100 text-emerald-500 flex items-center justify-center">
              <UserRound className="w-4 h-4" />
            </span>
            Sales & Client
          </h3>
          <div>
            {infoRow('Sales Representative', sample.sales_rep?.user_name || '—')}
            {infoRow('POC Name', sample.poc_name || '—')}
            {infoRow('POC Contact', sample.poc_contact || '—')}
            {infoRow('Designation', sample.designation || '—')}
            {infoRow('Address', sample.location || 'Not specified')}
            {infoRow('State', sample.state || '—')}
            {infoRow('Submitted', formatDate(sample.sample_submission_date))}
            {infoRow('Next Visit', formatDate(sample.next_visit_date) === '—' ? 'None scheduled' : formatDate(sample.next_visit_date))}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-gray-100 text-amber-500 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </span>
            Status
          </h3>
          <div>
            {infoRow('Current Status', sample.output || 'Pending')}
            {infoRow('Visits Count', String(sample.visits?.length || 0))}
          </div>
        </div>
      </div>

      {/* Visits + add-visit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
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
                      {formatDate(visit.visit_date)}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-700 text-sm">{visit.feedback || 'No feedback provided'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Add Follow-up Visit</h2>
          </div>
          <form className="p-6 space-y-4" onSubmit={handleAddVisit}>
            <div>
              <label className="block text-sm font-medium mb-2">Visit Date *</label>
              <input
                type="date"
                id="visit-date"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Feedback (Notes)</label>
              <textarea
                id="visit-feedback"
                rows={4}
                className="input"
              ></textarea>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full px-4 py-2.5 text-base mt-2"
            >
              Add Visit
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
