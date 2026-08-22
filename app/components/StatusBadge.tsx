// Flat design-system status badge. Status maps to a solid accent color block
// (flat — no ring, no shadow, rounded-md). Keeps AA contrast for AA-safe combos;
// amber/rose tints offset with dark text since white-on-amber is border-line.
const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Onboard: 'bg-emerald-500 text-white',
  'Not Interested': 'bg-rose-100 text-rose-800',
  'Interested but need time': 'bg-sky-100 text-sky-800',
}

const DISPLAY_TEXT: Record<string, string> = {
  Pending: 'Response Pending',
  Onboard: 'Onboarded Client',
  'Not Interested': 'Not Interested',
  'Interested but need time': 'Interested but need time',
}

export default function StatusBadge({ status }: { status?: string | null }) {
  const style = (status && STATUS_STYLES[status]) || 'bg-gray-100 text-gray-600'
  const displayText = (status && DISPLAY_TEXT[status]) || 'Unknown'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {displayText}
    </span>
  )
}