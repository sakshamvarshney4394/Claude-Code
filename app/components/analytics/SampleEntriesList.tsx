'use client'

import Link from 'next/link'
import { useMemo, useState, type ReactNode } from 'react'
import { PLAIN_STATUS, STATUS_ORDER, type SampleEntry } from '@/lib/analytics'
import { formatDate } from '@/lib/format'
import StatusBadge from '@/app/components/StatusBadge'

// How many rows show before "Show all". Enough to be useful at a glance without
// dropping several hundred rows into a details panel that already has a chart
// below it.
const FIRST_PAGE = 10

type SortKey = 'date' | 'status'

// Sort order for the status column: the four current statuses in the app's fixed
// order (good news first, hard "no" last), then anything unrecognised. Retired
// values like a legacy 'Closed' sort last rather than alphabetically among the
// real ones, so the odd rows cluster instead of hiding mid-list.
function statusRank(status: string): number {
  const i = STATUS_ORDER.indexOf(status as (typeof STATUS_ORDER)[number])
  return i === -1 ? STATUS_ORDER.length : i
}

export default function SampleEntriesList({
  entries,
  statusFilter,
  onClearFilter,
  onRowClick,
  hideProduct = false,
  hideCategory = false,
  hideRep = false,
}: {
  // Already scoped to one group by the caller. This component does no fetching
  // and no grouping — the grouping rules live in lib/analytics.ts and are applied
  // server-side, so there is only ever one implementation of "which samples
  // belong to this rep".
  entries: SampleEntry[]
  // The status card the user has toggled on, or null for "show everything".
  statusFilter: string | null
  onClearFilter: () => void
  // Called when a row navigates away, so the parent can reset transient UI.
  onRowClick?: () => void
  // Columns that would repeat the panel's own heading. Inside one product's
  // panel every row has that product; the column is noise.
  hideProduct?: boolean
  hideCategory?: boolean
  hideRep?: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [ascending, setAscending] = useState(false) // newest submission first
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(
    () => (statusFilter ? entries.filter((e) => e.status === statusFilter) : entries),
    [entries, statusFilter],
  )

  const sorted = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      let cmp: number
      if (sortKey === 'status') {
        cmp = statusRank(a.status) - statusRank(b.status)
        // Same status: fall back to newest first so the order is stable and
        // meaningful rather than whatever the fetch happened to return.
        if (cmp === 0) cmp = (b.sample_submission_date || '').localeCompare(a.sample_submission_date || '')
        return ascending ? -cmp : cmp
      }
      // ISO date strings (YYYY-MM-DD) compare correctly as strings, and unlike
      // `new Date(...)` they do so without a timezone shifting a date across a
      // day boundary. Rows with no submission date sort to the end.
      const av = a.sample_submission_date || ''
      const bv = b.sample_submission_date || ''
      if (!av && !bv) cmp = 0
      else if (!av) cmp = 1
      else if (!bv) cmp = -1
      else cmp = bv.localeCompare(av) // descending = newest first
      return ascending ? -cmp : cmp
    })
    return rows
  }, [filtered, sortKey, ascending])

  const visible = showAll ? sorted : sorted.slice(0, FIRST_PAGE)

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setAscending((prev) => !prev)
    } else {
      setSortKey(key)
      // Each column gets the reading most people want on first click: newest
      // dates first, best outcomes first.
      setAscending(false)
    }
  }

  const filterLabel = statusFilter ? PLAIN_STATUS[statusFilter] || statusFilter : null

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="text-lg font-bold">Which samples these were</h3>
        {filterLabel && (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Showing only “{filterLabel}” — show all statuses
          </button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-3">
        {sorted.length === 0
          ? 'No samples match this filter.'
          : `Showing ${visible.length} of ${sorted.length} ${sorted.length === 1 ? 'entry' : 'entries'}`}
        {statusFilter && sorted.length !== entries.length && ` (filtered from ${entries.length})`}
        {'. Tap a row to open that sample.'}
      </p>

      {sorted.length > 0 && (
        <>
          {/* Same overflow-x-auto table pattern as the leaderboard above, so the
              panel scrolls horizontally on a phone instead of squashing. */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Client</Th>
                  {!hideProduct && <Th>Product</Th>}
                  {!hideCategory && <Th>Category</Th>}
                  {!hideRep && <Th>Sales rep</Th>}
                  <Th>Where</Th>
                  <Th>
                    <SortButton
                      label="Submitted"
                      active={sortKey === 'date'}
                      ascending={ascending}
                      onClick={() => toggleSort('date')}
                    />
                  </Th>
                  <Th>
                    <SortButton
                      label="Status"
                      active={sortKey === 'status'}
                      ascending={ascending}
                      onClick={() => toggleSort('status')}
                    />
                  </Th>
                  <Th>Visits</Th>
                  <Th>Next visit</Th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visible.map((e) => (
                  <tr key={e.sample_id} className="hover:bg-gray-50">
                    <Td>
                      {/* prefetch={false}: <Link> otherwise prefetches every row
                          that scrolls into view, and the reader is going to open
                          at most one of them. */}
                      <Link
                        href={`/samples/${e.sample_id}`}
                        prefetch={false}
                        onClick={onRowClick}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {e.party_name}
                      </Link>
                    </Td>
                    {!hideProduct && <Td>{e.product_name}</Td>}
                    {!hideCategory && <Td>{e.category}</Td>}
                    {!hideRep && <Td>{e.sales_rep_name}</Td>}
                    <Td>
                      {e.location}
                      {e.state !== '—' && <span className="text-gray-500">, {e.state}</span>}
                    </Td>
                    <Td>{formatDate(e.sample_submission_date)}</Td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={e.status} vocabulary="plain" />
                        {!e.statusIsKnown && (
                          // computeGroup keeps this row out of the four status
                          // cards, so say so rather than leaving the reader to
                          // wonder why the numbers do not add up.
                          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded whitespace-nowrap">
                            not a current status
                          </span>
                        )}
                      </div>
                    </td>
                    <Td>{e.visitCount}</Td>
                    <Td>{formatDate(e.next_visit_date)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length > FIRST_PAGE && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              {showAll ? `Show only the first ${FIRST_PAGE}` : `Show all ${sorted.length}`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
      {children}
    </th>
  )
}

function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{children}</td>
}

function SortButton({
  label,
  active,
  ascending,
  onClick,
}: {
  label: string
  active: boolean
  ascending: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sort by ${label.toLowerCase()}`}
      className={`inline-flex items-center gap-1 uppercase tracking-wider ${
        active ? 'text-gray-900' : 'hover:text-gray-700'
      }`}
    >
      {label}
      <span aria-hidden="true" className={active ? '' : 'opacity-30'}>
        {active && ascending ? '▲' : '▼'}
      </span>
    </button>
  )
}
