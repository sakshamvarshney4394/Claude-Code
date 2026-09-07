import { groupSamples, Sample } from '@/lib/groupSamples'
import { computeSerialMap } from '@/lib/sampleNumber'

describe('groupSamples', () => {
  const sample1: Sample = {
    sample_id: 's1',
    party_name: 'burger singh',
    location: 'Delhi',
    product: { product_name: 'Momo Chutney', variant_name: null },
    sales_rep: { user_name: 'Rahul' },
    sample_submission_date: '2026-09-07T10:00:00.000Z',
    visits: [
      { visit_id: 'v1', visit_number: 1, visit_date: '2026-09-08', feedback: 'Good' },
    ],
    output: 'Pending',
    created_at: '2026-09-07T10:00:00.000Z',
  }

  const sample2: Sample = {
    sample_id: 's2',
    party_name: 'burger singh',
    location: 'Delhi',
    product: { product_name: 'Tomato Ketchup 8g Pouch', variant_name: null },
    sales_rep: { user_name: 'Rahul' },
    sample_submission_date: '2026-09-07T10:00:00.000Z',
    visits: [
      { visit_id: 'v2', visit_number: 1, visit_date: '2026-09-09', feedback: 'Needs change' },
      { visit_id: 'v3', visit_number: 2, visit_date: '2026-09-10', feedback: 'Approved' },
    ],
    output: 'Onboard',
    created_at: '2026-09-07T10:01:00.000Z',
  }

  const sample3DiffDate: Sample = {
    sample_id: 's3',
    party_name: 'burger singh',
    location: 'Delhi',
    product: { product_name: 'Pizza Pasta Sauce', variant_name: null },
    sales_rep: { user_name: 'Rahul' },
    sample_submission_date: '2026-09-04T10:00:00.000Z',
    visits: [],
    output: 'Pending',
    created_at: '2026-09-04T10:00:00.000Z',
  }

  const sample4OtherClient: Sample = {
    sample_id: 's4',
    party_name: "Haldiram's",
    location: 'Noida',
    product: { product_name: 'Samosa Chutney', variant_name: 'Spicy' },
    sales_rep: { user_name: 'Amit' },
    sample_submission_date: '2026-08-11T10:00:00.000Z',
    visits: [],
    output: 'Onboard',
    created_at: '2026-08-11T10:00:00.000Z',
  }

  it('groups samples sharing party_name and sample_submission_date into one visual group', () => {
    const all = [sample1, sample2, sample3DiffDate, sample4OtherClient]
    const { serialBySampleId, totalCount } = computeSerialMap(all)

    const groups = groupSamples(all, serialBySampleId, totalCount)

    // Should have 3 groups:
    // 1. burger singh @ 2026-09-07 (s1, s2)
    // 2. burger singh @ 2026-09-04 (s3)
    // 3. Haldiram's @ 2026-08-11 (s4)
    expect(groups).toHaveLength(3)

    const burgerGroup1 = groups.find(
      g => g.party_name === 'burger singh' && g.sample_submission_date?.startsWith('2026-09-07')
    )!
    expect(burgerGroup1).toBeDefined()
    expect(burgerGroup1.samples).toHaveLength(2)
    expect(burgerGroup1.proposed_products_text).toBe('Momo Chutney, Tomato Ketchup 8g Pouch')
    expect(burgerGroup1.total_visits).toBe(3) // 1 from s1 + 2 from s2
    expect(burgerGroup1.status).toBe('Mixed') // Pending vs Onboard
  })

  it('keeps separate dates for the same client in separate groups', () => {
    const all = [sample1, sample2, sample3DiffDate]
    const { serialBySampleId, totalCount } = computeSerialMap(all)

    const groups = groupSamples(all, serialBySampleId, totalCount)
    const burgerGroups = groups.filter(g => g.party_name === 'burger singh')

    expect(burgerGroups).toHaveLength(2)
  })

  it('shows single status when all rows in group share the same status', () => {
    const s1Pending = { ...sample1, output: 'Pending' }
    const s2Pending = { ...sample2, output: 'Pending' }
    const all = [s1Pending, s2Pending]
    const { serialBySampleId, totalCount } = computeSerialMap(all)

    const [group] = groupSamples(all, serialBySampleId, totalCount)
    expect(group.status).toBe('Pending')
  })

  it('displays range sample ID for multi-item groups and single ID for single-item groups', () => {
    const all = [sample4OtherClient, sample3DiffDate, sample1, sample2]
    const { serialBySampleId, totalCount } = computeSerialMap(all)

    const groups = groupSamples(all, serialBySampleId, totalCount)

    const multiGroup = groups.find(g => g.samples.length === 2)!
    const singleGroup = groups.find(g => g.party_name === "Haldiram's")!

    expect(multiGroup.sample_id_display).toContain('–')
    expect(singleGroup.sample_id_display).not.toContain('–')
  })

  it('includes variant name in proposed products text if present', () => {
    const all = [sample4OtherClient]
    const { serialBySampleId, totalCount } = computeSerialMap(all)

    const [group] = groupSamples(all, serialBySampleId, totalCount)
    expect(group.proposed_products_text).toBe('Samosa Chutney (Spicy)')
  })
})
