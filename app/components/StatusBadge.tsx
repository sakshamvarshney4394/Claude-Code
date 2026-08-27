import { PLAIN_STATUS } from '@/lib/analytics'

// Flat design-system status badge. Status maps to a solid accent color block
// (flat — no ring, no shadow, rounded-md). Keeps AA contrast for AA-safe combos;
// amber/rose tints offset with dark text since white-on-amber is border-line.
//
// Colours are defined ONCE here and are the single source of truth. They also
// match MonthlyOutcomeChart's series colours (emerald / sky / amber / rose) so a
// status reads the same in a badge and in the chart — keep that alignment.
const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Onboard: 'bg-emerald-500 text-white',
  'Not Interested': 'bg-rose-100 text-rose-800',
  'Interested but need time': 'bg-sky-100 text-sky-800',
}

// Operational wording, used on /samples and the sample detail page — the screens
// where someone is working a pipeline.
const DISPLAY_TEXT: Record<string, string> = {
  Pending: 'Response Pending',
  Onboard: 'Onboarded Client',
  'Not Interested': 'Not Interested',
  'Interested but need time': 'Interested but need time',
}

// Analytics used to speak plainer than the rest of the app ("Became clients", not
// "Onboarded Client"), so a badge inside an analytics panel had to agree with the
// status card above it. Callers therefore opt into the plain vocabulary.
//
// As of the 2026-08-25 relabelling the two vocabularies have very nearly converged:
// PLAIN_STATUS now says 'Onboarded clients' / 'Interested but need time' /
// 'Response pending' / 'Not Interested', which differs from DISPLAY_TEXT above only
// in case and plurality. Collapsing the two maps into one was offered to the owner
// and deferred, so both still exist and must be kept in step by hand. If they ever
// diverge again, PLAIN_STATUS in lib/analytics.ts is the one the analytics cards and
// the monthly chart read.
//
// 'operational' is the default so every existing caller is unaffected.
export type StatusVocabulary = 'operational' | 'plain'

export default function StatusBadge({
  status,
  vocabulary = 'operational',
}: {
  status?: string | null
  vocabulary?: StatusVocabulary
}) {
  const style = (status && STATUS_STYLES[status]) || 'bg-gray-100 text-gray-600'

  // The plain words come from PLAIN_STATUS in lib/analytics, the same map the
  // status cards and the monthly chart read. A second copy of those four strings
  // here would let the badge and the card it sits under drift apart.
  //
  // The fallback differs by vocabulary on purpose. Operational screens show
  // 'Unknown' for an unrecognised value; analytics shows the RAW stored value
  // (e.g. a legacy 'Closed') because the whole point of surfacing those rows is
  // that someone can find the bad data and fix it — 'Unknown' hides which value
  // is wrong.
  const displayText =
    vocabulary === 'plain'
      ? (status && PLAIN_STATUS[status]) || status || 'Unknown'
      : (status && DISPLAY_TEXT[status]) || 'Unknown'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {displayText}
    </span>
  )
}
