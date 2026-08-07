// Safe date formatting for the UI.
//
// Why this exists: Supabase returns sample_submission_date as an ISO date string
// (YYYY-MM-DD). Two problems with the old `new Date(...).toLocaleDateString()`:
//
//   1. `new Date("2024-04-04")` is parsed as UTC midnight, so in negative-offset
//      timezones it can shift the displayed day. We parse the parts directly to
//      stay timezone-independent.
//   2. Bad data (e.g. a corrupt row storing "0544-04-04") produced nonsense like
//      "4/4/544" instead of a real date. We validate the year is plausible and
//      fall back to the raw string if it isn't.
//
// This is a display concern only — it never mutates stored data.
export function formatDate(value: unknown): string {
  // Coerce guard: only strings are expected. Numbers/timestamps fall through to fallback.
  if (typeof value !== 'string' || !value) return '—'
  const trimmed = value.trim()
  if (!trimmed) return '—'

  // Accept YYYY-MM-DD and timestamp-with-timezone ISO strings (e.g. 2024-04-04T00:00:00Z).
  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!isoDate) {
    // Fall through to a real parse attempt for other formats.
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? trimmed : escapeInvalid(d)
  }

  const year = Number(isoDate[1])
  const month = Number(isoDate[2])
  const day = Number(isoDate[3])

  // Banker: reject implausible years (e.g. 0544) and invalid month/day ranges.
  if (year < 999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return trimmed // show what's actually stored rather than a bogus date
  }

  const dt = new Date(year, month - 1, day)
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return trimmed
  }

  return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
}

function escapeInvalid(d: Date): string {
  const y = d.getFullYear()
  if (y < 999) return d.toDateString() // explicitly show the odd value, not a year-544 artifact
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' })
}