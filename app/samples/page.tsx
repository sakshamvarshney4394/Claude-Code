'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import StatusBadge from '@/app/components/StatusBadge'
import { formatDate } from '@/lib/format'
import { formatSampleNumber, computeSerialMap } from '@/lib/sampleNumber'
import { Download, Plus, Trash2, Eye, Pencil, Search, SearchX, FilterX, ChevronDown, Inbox } from 'lucide-react'

type Sample = {
  sample_id: string;
  party_name: string;
  location: string | null;
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

// Row "Actions" dropdown (View / Edit / Delete). Rendered as a `position: fixed`
// menu positioned from the trigger's viewport rect, so it is never clipped by the
// table's `overflow-x-auto` container. Closes on outside click, scroll, or resize.
function RowActionsMenu({
  sample,
  deleting,
  onDelete,
}: {
  sample: Sample
  deleting: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({ top: rect.bottom + 4, left: rect.right })
    setOpen(true)
  }

  // Close the menu if the page scrolls/resizes so it never floats detached from its row.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        disabled={deleting}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-secondary text-sm px-3 py-2 disabled:opacity-50"
      >
        {deleting ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            Deleting
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            Actions
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && pos && (
        <>
          {/* Invisible backdrop — clicking anywhere outside closes the menu */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Menu right-aligned under the trigger (translate -100% keeps it on screen) */}
          <div
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 min-w-36 -translate-x-full rounded-lg border border-gray-200 bg-white py-1.5"
          >
            <Link
              href={`/samples/${sample.sample_id}`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" /> View
            </Link>
            {/* Edit route doesn't exist yet — it will 404 for now; built in a future session. */}
            <Link
              href={`/samples/${sample.sample_id}/edit`}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4" /> Edit
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function SamplesPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null) // Sample being deleted
  const [rowError, setRowError] = useState<string | null>(null) // Per-row delete errors
  // Clear all data state
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState<string | null>(null)

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

  // Delete a single sample (and its visits — cascade handled server-side).
  async function handleDeleteSample(sampleId: string, partyName: string) {
    // Confirmation dialog before any destructive delete — never delete on single click.
    if (!window.confirm(`Delete this sample and all its visit history? This cannot be undone.`)) {
      return
    }

    setDeletingId(sampleId)
    setRowError(null)

    try {
      const res = await fetch(`/api/samples/${sampleId}`, {
        method: 'DELETE',
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete sample')
      }

      // Remove the deleted sample from the local list.
      setSamples(prev => prev.filter(s => s.sample_id !== sampleId))
    } catch (err) {
      setRowError(`Could not delete "${partyName}": ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDeletingId(null)
    }
  }

  // Feature 3: Export current samples to an .xlsx file, client-side only.
  // Columns match the table (Sample ID, Client Name, Product, Sales Representative,
  // Submitted, Visit count, Status). Reuses already-loaded data — no backend call.
  function handleExport() {
    const rows = samples.map(s => ({
      'Sample ID': formatSampleNumber(serialBySampleId.get(s.sample_id) ?? 0, totalCount),
      'Client Name': s.party_name,
      'Product': s.product?.product_name || '—',
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

  // Clear all samples and visits
  async function handleClearAll() {
    if (!window.confirm(`Delete all ${samples.length} samples and their visits? This cannot be undone.`)) {
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

      // Clear the local samples list
      setSamples([])
    } catch (err) {
      setClearError(`Could not clear data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setClearing(false)
    }
  }

  // Reset both filters to their unfiltered state.
  const resetFilters = () => {
    setSearch('')
    setDateFilter('')
  }

  const hasFilters = search.trim() !== '' || dateFilter !== ''

  // Combine both filters with AND logic. Text matches Client Name, Product Name, or
  // Sales Representative (case-insensitive substring). Date matches sample_submission_date.
  // Serial numbers are computed from the FULL creation-order list (not the filtered
  // subset), so a filtered view can show non-consecutive numbers like 0002/0007/0011.
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

  // Stats row (colour-blocked, flat) — reflects all samples, not the filtered subset.
  const pendingCount = samples.filter(s => s.output === 'Pending').length
  const onboardCount = samples.filter(s => s.output === 'Onboard').length

  return (
    <div className="py-6 space-y-6">
      {/* Page header + actions (New Sample lives in the top bar; keep actions here lean) */}
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

      {rowError && (
        <div className="bg-rose-100 border-2 border-rose-400 text-rose-800 px-4 py-3 rounded-md">
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm">{rowError}</p>
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

      {/* Clear All Data button */}
      {samples.length > 0 && (
        <div className="flex justify-end mt-6">
          <button
            type="button"
            disabled={clearing}
            onClick={handleClearAll}
            className={`btn btn-${clearing ? 'secondary' : 'destructive'} text-sm px-4 py-2 ${
              clearing ? 'opacity-50' : ''
            }`}
          >
            {clearing ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                Clearing...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Clear All Data
              </span>
            )}
          </button>
          {clearError && (
            <div className="mt-3 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
              <p className="font-medium">Something went wrong</p>
              <p className="text-sm">{clearError}</p>
            </div>
          )}
        </div>
      )}

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
          {/* Search bar — text + date filters, combinable (AND), client-side */}
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

          {/* No-results state — distinct from the empty ("no samples yet") state above */}
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
              {/* Desktop table (>=768px) */}
              <div className="hidden md:block card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Sample ID</th>
                        <th className="px-6 py-3 font-semibold">Client Name</th>
                        <th className="px-6 py-3 font-semibold">Product</th>
                        <th className="px-6 py-3 font-semibold">Sales Representative</th>
                        <th className="px-6 py-3 font-semibold">Address</th>
                        <th className="px-6 py-3 font-semibold">Submitted</th>
                        <th className="px-6 py-3 font-semibold">Visits</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                        <th className="px-6 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSamples.map(sample => (
                        <tr key={sample.sample_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">{formatSampleNumber(serialBySampleId.get(sample.sample_id) ?? 0, totalCount)}</td>
                          <td className="px-6 py-4 text-gray-700">{sample.party_name}</td>
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
                          <td className="px-6 py-4 text-right">
                            <RowActionsMenu
                              sample={sample}
                              deleting={deletingId === sample.sample_id}
                              onDelete={() => handleDeleteSample(sample.sample_id, sample.party_name)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile stacked cards (<768px) */}
              <div className="md:hidden space-y-4">
                {filteredSamples.map(sample => (
                  <div key={sample.sample_id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{sample.party_name}</h3>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{formatSampleNumber(serialBySampleId.get(sample.sample_id) ?? 0, totalCount)}</p>
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
                    <div className="mt-4">
                      <RowActionsMenu
                        sample={sample}
                        deleting={deletingId === sample.sample_id}
                        onDelete={() => handleDeleteSample(sample.sample_id, sample.party_name)}
                      />
                    </div>
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