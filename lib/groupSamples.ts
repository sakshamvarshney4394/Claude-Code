import { formatSampleNumber } from './sampleNumber'

export type Sample = {
  sample_id: string
  party_name: string
  location: string | null
  state?: string | null
  poc_name?: string | null
  poc_contact?: string | null
  designation?: string | null
  poc_category?: string | null
  category?: string | null
  product: {
    product_name: string
    variant_name?: string | null
    category?: string | null
  } | null
  sales_rep: {
    user_name: string
  } | null
  sample_submission_date: string | null
  next_visit_date?: string | null
  visits: Array<{
    visit_id: string
    visit_number: number
    visit_date: string
    feedback: string | null
  }> | null
  output: string
  created_at?: string | null
}

export type GroupedSample = {
  groupKey: string
  party_name: string
  sample_submission_date: string | null
  sales_rep: {
    user_name: string
  } | null
  location: string | null
  state: string | null
  samples: Sample[]
  proposed_products_text: string
  total_visits: number
  status: string
  primary_sample_id: string
  sample_id_display: string
  minSerial: number
  maxSerial: number
}

/**
 * Groups samples by (party_name + sample_submission_date).
 * Rows sharing both values become one visual row in the list.
 * A new date for the same client = a separate group.
 */
export function groupSamples(
  samples: Sample[],
  serialBySampleId: Map<string, number>,
  totalCount: number
): GroupedSample[] {
  const groupMap = new Map<string, Sample[]>()
  const groupOrder: string[] = []

  for (const sample of samples) {
    const dateStr = sample.sample_submission_date
      ? sample.sample_submission_date.slice(0, 10)
      : ''
    const key = `${sample.party_name.trim()}:::${dateStr}`

    if (!groupMap.has(key)) {
      groupMap.set(key, [])
      groupOrder.push(key)
    }
    groupMap.get(key)!.push(sample)
  }

  return groupOrder.map(key => {
    const groupRows = groupMap.get(key)!
    const first = groupRows[0]

    const productNames = groupRows.map(s => {
      if (!s.product?.product_name) return '—'
      return s.product.variant_name
        ? `${s.product.product_name} (${s.product.variant_name})`
        : s.product.product_name
    })

    const proposed_products_text = productNames.join(', ')

    const total_visits = groupRows.reduce(
      (acc, s) => acc + (s.visits?.length || 0),
      0
    )

    const statuses = Array.from(
      new Set(groupRows.map(s => s.output || 'Pending'))
    )
    const status = statuses.length === 1 ? statuses[0] : 'Mixed'

    const serials = groupRows
      .map(s => serialBySampleId.get(s.sample_id) ?? 0)
      .filter(n => n > 0)

    const minSerial = serials.length > 0 ? Math.min(...serials) : 0
    const maxSerial = serials.length > 0 ? Math.max(...serials) : 0

    const sample_id_display =
      minSerial === 0
        ? first.sample_id
        : minSerial === maxSerial
        ? formatSampleNumber(minSerial, totalCount)
        : `${formatSampleNumber(minSerial, totalCount)}–${formatSampleNumber(maxSerial, totalCount)}`

    const primary_sample_id = first.sample_id

    return {
      groupKey: key,
      party_name: first.party_name,
      sample_submission_date: first.sample_submission_date,
      sales_rep: first.sales_rep,
      location: first.location,
      state: first.state ?? null,
      samples: groupRows,
      proposed_products_text,
      total_visits,
      status,
      primary_sample_id,
      sample_id_display,
      minSerial,
      maxSerial,
    }
  })
}
