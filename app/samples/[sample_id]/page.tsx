'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import StatusBadge from '@/app/components/StatusBadge'
import { formatDate } from '@/lib/format'
import { formatSampleNumber, computeSerialMap } from '@/lib/sampleNumber'
import { Sample } from '@/lib/groupSamples'
import { Package, UserRound, Activity, Pencil, Trash2, Calendar, MapPin, Building2, User, Phone, Briefcase } from 'lucide-react'

export default function SampleDetailPage() {
  const { sample_id } = useParams<{ sample_id: string }>()
  const router = useRouter()

  const [allSamples, setAllSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Controlled form state for adding visits keyed by sample_id
  const [visitForms, setVisitForms] = useState<Record<string, { date: string; feedback: string }>>({})

  // Fetch all samples to compute serial numbers and group related samples
  const fetchAll = async () => {
    try {
      const res = await fetch('/api/samples')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load samples')
      setAllSamples(json.data || [])
      return json.data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load samples')
      return []
    }
  }

  useEffect(() => {
    if (!sample_id) return

    const init = async () => {
      setLoading(true)
      const data = await fetchAll()
      const found = data.find((s: Sample) => s.sample_id === sample_id)
      if (!found && data.length > 0) {
        // Sample id not found in active list
        router.push('/samples')
      }
      setLoading(false)
    }

    init()
  }, [sample_id, router])

  const { serialBySampleId, totalCount } = useMemo(
    () => computeSerialMap(allSamples),
    [allSamples]
  )

  const currentSample = allSamples.find(s => s.sample_id === sample_id)

  // Find all samples in the same group (same party_name + same sample_submission_date)
  const groupSamples = useMemo(() => {
    if (!currentSample) return []
    const currentDate = currentSample.sample_submission_date
      ? currentSample.sample_submission_date.slice(0, 10)
      : ''
    return allSamples.filter(s => {
      const sDate = s.sample_submission_date ? s.sample_submission_date.slice(0, 10) : ''
      return s.party_name === currentSample.party_name && sDate === currentDate
    })
  }, [allSamples, currentSample])

  // Overall group status
  const groupStatus = useMemo(() => {
    if (!groupSamples.length) return 'Pending'
    const statuses = Array.from(new Set(groupSamples.map(s => s.output || 'Pending')))
    return statuses.length === 1 ? statuses[0] : 'Mixed'
  }, [groupSamples])

  // Group serial number display (e.g. 0012–0014 or 0012)
  const groupSerialDisplay = useMemo(() => {
    if (!groupSamples.length) return ''
    const serials = groupSamples
      .map(s => serialBySampleId.get(s.sample_id) ?? 0)
      .filter(n => n > 0)
    if (!serials.length) return ''
    const min = Math.min(...serials)
    const max = Math.max(...serials)
    return min === max
      ? `Sample #${formatSampleNumber(min, totalCount)}`
      : `Sample #${formatSampleNumber(min, totalCount)}–${formatSampleNumber(max, totalCount)}`
  }, [groupSamples, serialBySampleId, totalCount])

  // Delete handler for any sample
  const handleDelete = async (targetId: string, productName?: string) => {
    const label = productName ? `"${productName}"` : 'this sample'
    if (!window.confirm(`Delete ${label} and all its visit history? This cannot be undone.`)) {
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch(`/api/samples/${targetId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete sample')

      const remainingInGroup = groupSamples.filter(s => s.sample_id !== targetId)
      if (remainingInGroup.length === 0) {
        router.push('/samples')
      } else {
        if (targetId === sample_id) {
          router.replace(`/samples/${remainingInGroup[0].sample_id}`)
        }
        await fetchAll()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sample')
    } finally {
      setActionLoading(false)
    }
  }

  // Add visit handler for any sample
  const handleAddVisit = async (targetId: string, e: React.FormEvent) => {
    e.preventDefault()
    const form = visitForms[targetId] || { date: '', feedback: '' }

    if (!form.date) {
      alert('Please select a visit date')
      return
    }

    try {
      setActionLoading(true)
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_id: targetId,
          visit_date: form.date,
          feedback: form.feedback || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to add visit')

      // Clear input state for this sample
      setVisitForms(prev => ({
        ...prev,
        [targetId]: { date: '', feedback: '' },
      }))

      await fetchAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setActionLoading(false)
    }
  }

  const updateVisitField = (targetId: string, field: 'date' | 'feedback', value: string) => {
    setVisitForms(prev => ({
      ...prev,
      [targetId]: {
        ...(prev[targetId] || { date: '', feedback: '' }),
        [field]: value,
      },
    }))
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
  if (!currentSample) return <div className="text-center py-24 text-gray-500">No sample found</div>

  const infoRow = (label: string, value: string) => (
    <div className="py-2.5 flex justify-between items-start gap-4 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )

  // ----------------------------------------------------------------------------------
  // MULTI-PRODUCT GROUP VIEW (groupSamples.length > 1)
  // ----------------------------------------------------------------------------------
  if (groupSamples.length > 1) {
    return (
      <div className="py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link href="/samples" className="text-sm text-gray-500 hover:text-gray-700">
                ← Back to All Samples
              </Link>
              <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900 mt-1">
                {currentSample.party_name}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">
                {groupSerialDisplay} • {groupSamples.length} Products Group
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={groupStatus} />
            </div>
          </div>
        </div>

        {/* Client Info Card (shown once at top) */}
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-md bg-gray-100 text-emerald-500 flex items-center justify-center">
              <UserRound className="w-4 h-4" />
            </span>
            Client & Sales Representative Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Sales Rep</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {currentSample.sales_rep?.user_name || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Point of Contact</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {currentSample.poc_name || '—'} {currentSample.designation ? `(${currentSample.designation})` : ''}
              </p>
              {currentSample.poc_contact && (
                <p className="text-xs text-gray-500 mt-0.5">{currentSample.poc_contact}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Address / State</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {currentSample.location || 'Not specified'}
              </p>
              {currentSample.state && (
                <p className="text-xs text-gray-500 mt-0.5">{currentSample.state}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Dates</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                Submitted: {formatDate(currentSample.sample_submission_date)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Next Visit: {formatDate(currentSample.next_visit_date) === '—' ? 'None scheduled' : formatDate(currentSample.next_visit_date)}
              </p>
            </div>
          </div>
        </div>

        {/* Section: Proposed Products */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Proposed Products ({groupSamples.length})
            </h2>
          </div>

          <div className="space-y-6">
            {groupSamples.map(item => {
              const itemSerial = serialBySampleId.get(item.sample_id)
              const form = visitForms[item.sample_id] || { date: '', feedback: '' }

              return (
                <div key={item.sample_id} className="card p-6 space-y-6">
                  {/* Product Header & Actions */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {item.product?.product_name || '—'}
                          {item.product?.variant_name ? ` (${item.product.variant_name})` : ''}
                        </h3>
                        <StatusBadge status={item.output} />
                      </div>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {itemSerial ? `Sample #${formatSampleNumber(itemSerial, totalCount)}` : item.sample_id} • Category: {item.category || item.product?.category || '—'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/samples/${item.sample_id}/edit`}
                        className="btn btn-secondary text-sm px-3.5 py-1.5 inline-flex items-center gap-1.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.sample_id, item.product?.product_name)}
                        disabled={actionLoading}
                        className="btn btn-secondary text-sm px-3.5 py-1.5 inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Visits & Add Visit for this product */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Follow-up Visits */}
                    <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">
                        Follow-up Visits ({item.visits?.length || 0})
                      </h4>
                      {!item.visits || item.visits.length === 0 ? (
                        <p className="text-gray-500 text-sm py-4">No visits recorded yet.</p>
                      ) : (
                        <div className="divide-y divide-gray-200 max-h-56 overflow-y-auto space-y-3">
                          {item.visits.map(visit => (
                            <div key={visit.visit_id} className="pt-3 first:pt-0">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-gray-900 bg-white border border-gray-200 rounded px-2 py-0.5">
                                  Visit #{visit.visit_number}
                                </span>
                                <span className="text-gray-500">
                                  {formatDate(visit.visit_date)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-gray-700 text-sm">
                                {visit.feedback || 'No feedback provided'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Add Follow-up Visit Form */}
                    <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">
                        Add Follow-up Visit
                      </h4>
                      <form onSubmit={e => handleAddVisit(item.sample_id, e)} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Visit Date *
                          </label>
                          <input
                            type="date"
                            value={form.date}
                            onChange={e => updateVisitField(item.sample_id, 'date', e.target.value)}
                            className="input text-sm py-1.5"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Feedback (Notes)
                          </label>
                          <textarea
                            rows={2}
                            value={form.feedback}
                            onChange={e => updateVisitField(item.sample_id, 'feedback', e.target.value)}
                            className="input text-sm py-1.5"
                            placeholder="Enter notes..."
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="btn btn-primary w-full text-sm py-2"
                        >
                          Add Visit
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------------------------------------
  // SINGLE-PRODUCT SAMPLE VIEW (groupSamples.length === 1 or fallback)
  // Exactly behaves as existing view
  // ----------------------------------------------------------------------------------
  const serialNumber = serialBySampleId.get(currentSample.sample_id) ?? null
  const singleForm = visitForms[currentSample.sample_id] || { date: '', feedback: '' }

  return (
    <div className="py-6 space-y-6">
      {/* Page header with exactly Edit and Delete action buttons */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/samples" className="text-sm text-gray-500 hover:text-gray-700">
              ← Back to All Samples
            </Link>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900 mt-1">
              {currentSample.party_name}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              {serialNumber
                ? `Sample #${formatSampleNumber(serialNumber, totalCount)}`
                : currentSample.sample_id}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={currentSample.output} />
            <Link
              href={`/samples/${currentSample.sample_id}/edit`}
              className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
            <button
              onClick={() => handleDelete(currentSample.sample_id, currentSample.product?.product_name)}
              disabled={actionLoading}
              className="btn btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {actionLoading ? 'Processing...' : 'Delete'}
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
            {infoRow('Proposed Product', currentSample.product?.product_name || '—')}
            {infoRow('Category', currentSample.category || currentSample.product?.category || '—')}
            {infoRow('POC Category', currentSample.poc_category || '—')}
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
            {infoRow('Sales Representative', currentSample.sales_rep?.user_name || '—')}
            {infoRow('POC Name', currentSample.poc_name || '—')}
            {infoRow('POC Contact', currentSample.poc_contact || '—')}
            {infoRow('Designation', currentSample.designation || '—')}
            {infoRow('Address', currentSample.location || 'Not specified')}
            {infoRow('State', currentSample.state || '—')}
            {infoRow('Submitted', formatDate(currentSample.sample_submission_date))}
            {infoRow(
              'Next Visit',
              formatDate(currentSample.next_visit_date) === '—'
                ? 'None scheduled'
                : formatDate(currentSample.next_visit_date)
            )}
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
            {infoRow('Current Status', currentSample.output || 'Pending')}
            {infoRow('Visits Count', String(currentSample.visits?.length || 0))}
          </div>
        </div>
      </div>

      {/* Visits + add-visit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Follow-up Visits</h2>
          </div>

          {!currentSample.visits || currentSample.visits.length === 0 ? (
            <p className="text-gray-500 p-6">No visits recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {currentSample.visits.map(visit => (
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
          <form className="p-6 space-y-4" onSubmit={e => handleAddVisit(currentSample.sample_id, e)}>
            <div>
              <label className="block text-sm font-medium mb-2">Visit Date *</label>
              <input
                type="date"
                value={singleForm.date}
                onChange={e => updateVisitField(currentSample.sample_id, 'date', e.target.value)}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Feedback (Notes)</label>
              <textarea
                rows={4}
                value={singleForm.feedback}
                onChange={e => updateVisitField(currentSample.sample_id, 'feedback', e.target.value)}
                className="input"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
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
