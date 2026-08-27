'use client'

// The single most important number on the page, made unmissable: how many of
// the samples we sent were onboarded as clients. A green bar fills to match, so
// the size of the win is visible without reading any numbers.

import { Fraction, formatPct } from '@/lib/analytics'

export default function SuccessHero({
  success,
  inWords,
  lowSampleSize,
}: {
  success: Fraction
  inWords: string
  lowSampleSize?: boolean
}) {
  const width = Math.min(Math.max(success.pct, 0), 100)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-sm font-semibold text-gray-500 mb-1">Onboarded clients</p>

      <p className="text-4xl font-extrabold text-gray-900 leading-tight">
        {success.part} <span className="text-2xl font-bold text-gray-400">of</span> {success.whole}
      </p>

      <p className="text-lg font-semibold text-emerald-600 mt-1">
        {formatPct(success.pct)}% — {inWords}
        {lowSampleSize && (
          <span className="ml-2 align-middle bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded">
            Only {success.whole} so far — too few to be sure
          </span>
        )}
      </p>

      <div className="mt-4 h-4 w-full rounded-full bg-gray-100 overflow-hidden" aria-hidden>
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Green = samples that were onboarded as clients, out of everyone we sent to.
      </p>
    </div>
  )
}
