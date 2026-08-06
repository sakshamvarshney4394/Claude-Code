// Shared status badge — one consistent look for the output status across the app.
// Maps each output value to a Tailwind pill style.
const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  Onboard: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Closed: 'bg-slate-200 text-slate-700 ring-slate-300',
  'Not Interested': 'bg-rose-100 text-rose-800 ring-rose-200',
  'Interested but need time': 'bg-sky-100 text-sky-800 ring-sky-200',
}

export default function StatusBadge({ status }: { status?: string | null }) {
  const style = (status && STATUS_STYLES[status]) || 'bg-gray-100 text-gray-600 ring-gray-200'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ring-1 ring-inset ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {status || 'Unknown'}
    </span>
  )
}
