'use client'

// One simple picture, shared by the Products, Categories and Sales-Rep pages.
//
// Design brief: a grandma or a child should get it at a glance. So:
//   - one bar per month, height = how many samples went out (a shape everyone knows)
//   - each bar is coloured by what happened: green was onboarded as a client, and
//     the rest shown honestly above it. Taller green = better. No second axis, no
//     line.
//   - a plain-English sentence underneath says what the picture means.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { MonthPoint, oneInN, formatPct } from '@/lib/analytics'

// Colours reuse the app's status palette (see StatusBadge) so the meaning is
// consistent everywhere: green = onboarded, sky = interested, amber = pending,
// rose = not interested.
const SERIES = [
  { key: 'becameClients', label: 'Onboarded clients', color: '#10B981' },
  { key: 'stillDeciding', label: 'Interested but need time', color: '#38BDF8' },
  { key: 'waiting', label: 'Response pending', color: '#FBBF24' },
  { key: 'saidNo', label: 'Not Interested', color: '#FB7185' },
] as const

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload as MonthPoint | undefined
  if (!point) return null

  const rows: Array<{ label: string; value: number; color: string }> = SERIES.map((s) => ({
    label: s.label,
    value: point[s.key],
    color: s.color,
  })).filter((r) => r.value > 0)

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: '10px 12px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
        minWidth: 180,
      }}
    >
      <p style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{point.month}</p>
      <p style={{ color: '#374151', fontWeight: 600, marginBottom: 8 }}>
        {point.samplesSent} {point.samplesSent === 1 ? 'sample' : 'samples'} sent
      </p>
      {rows.map((r) => (
        <p key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151', margin: '2px 0' }}>
          <span style={{ width: 10, height: 10, borderRadius: 9999, background: r.color, display: 'inline-block' }} />
          {r.value} {r.label.toLowerCase()}
        </p>
      ))}
      <p style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6', color: '#059669', fontWeight: 700 }}>
        {point.becameClients} of {point.samplesSent} onboarded as clients ({formatPct(point.successPct)}%)
      </p>
    </div>
  )
}

// One or two plain sentences that say what the bars mean.
function buildCaption(data: MonthPoint[]): string {
  const active = data.filter((d) => d.samplesSent > 0)
  if (active.length === 0) return 'No samples were sent in this time range yet.'

  const totalSent = active.reduce((a, b) => a + b.samplesSent, 0)
  const totalClients = active.reduce((a, b) => a + b.becameClients, 0)

  const overall = `So far, ${totalClients} of the ${totalSent} ${
    totalSent === 1 ? 'sample' : 'samples'
  } sent were onboarded as clients — ${oneInN(totalClients, totalSent)}.`

  if (active.length < 2) return overall

  // Best month by success, needing at least one client to count.
  const withClients = active.filter((d) => d.becameClients > 0)
  if (withClients.length === 0) {
    return `${overall} None have been onboarded as clients yet.`
  }
  let best = withClients[0]
  for (const d of withClients) {
    if (d.successPct > best.successPct) best = d
  }
  return `${overall} The best month was ${best.month}, when ${best.becameClients} of ${best.samplesSent} were onboarded as clients.`
}

export default function MonthlyOutcomeChart({ data }: { data: MonthPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg text-center">
        <p className="text-gray-500">No monthly data for the selected dates yet.</p>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
            domain={[0, 'dataMax + 1']}
            label={{
              value: 'Samples',
              angle: -90,
              position: 'insideLeft',
              offset: 12,
              fill: '#6B7280',
              fontSize: 12,
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
          <Legend
            layout="horizontal"
            align="center"
            verticalAlign="bottom"
            iconType="circle"
            iconSize={9}
            wrapperStyle={{ paddingTop: 12, fontSize: 13 }}
          />
          {SERIES.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="outcome"
              fill={s.color}
              maxBarSize={64}
              // Round only the very top of the stack.
              radius={s.key === 'saidNo' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <p className="mt-3 text-center text-base text-gray-700 font-medium">{buildCaption(data)}</p>
    </div>
  )
}
