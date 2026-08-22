// Shared helper for the display-only sequential "sample number" shown across
// the app in place of the raw database identifier (UUID). The real sample_id
// (used in routes / API / FKs) is NEVER replaced — this is purely a computed,
// zero-padded, human-friendly label.
//
// `position` is 1-based (oldest sample = 1) and `totalCount` is the current
// total number of samples. Padding width = max(4, number of digits in totalCount)
// so it's 4 digits below 1000 samples and grows to 5+ once the total reaches
// 1000, applied uniformly to every row (old and new).
export function formatSampleNumber(position: number, totalCount: number): string {
  const width = Math.max(4, String(Math.max(0, totalCount)).length)
  return String(Math.max(0, position)).padStart(width, '0')
}

// Given the full (already-loaded) samples list, return a Map from each
// sample_id to its 1-based creation-order position and the total count.
// Sorting is by created_at ascending; ties (same timestamp) keep array order.
// Recomputed fresh every call — nothing is persisted.
export function computeSerialMap(
  samples: Array<{ sample_id: string; created_at?: string | null }>
): { serialBySampleId: Map<string, number>; totalCount: number } {
  const ordered = [...samples].sort((a, b) => {
    const ta = a.created_at ?? ''
    const tb = b.created_at ?? ''
    if (ta < tb) return -1
    if (ta > tb) return 1
    return 0
  })
  const serialBySampleId = new Map<string, number>()
  ordered.forEach((s, i) => serialBySampleId.set(s.sample_id, i + 1))
  return { serialBySampleId, totalCount: samples.length }
}
