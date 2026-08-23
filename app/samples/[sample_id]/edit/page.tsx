'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { INDIAN_STATES } from '@/lib/indian_states'
import { formatDate } from '@/lib/format'

const VALID_OUTPUTS = ['Pending', 'Onboard', 'Not Interested', 'Interested but need time']

const OUTPUT_DISPLAY_TEXT: Record<string, string> = {
  Pending: 'Response Pending',
  Onboard: 'Onboarded Client',
  'Not Interested': 'Not Interested',
  'Interested but need time': 'Interested but need time',
}
const POC_CATEGORIES = ['HORECA', 'QSR', 'Distributors', 'Exporters']

export default function EditSamplePage() {
  const { sample_id } = useParams<{ sample_id: string }>()
  const router = useRouter()

  const [formData, setFormData] = useState({
    party_name: '',
    category: '',
    poc_name: '',
    poc_contact: '',
    designation: '',
    product_id: '',
    sample_submission_date: '',
    location: '',
    state: '',
    next_visit_date: '',
    sales_rep_id: '',
    poc_category: '',
    output: '' // status
  })

  const [customCategory, setCustomCategory] = useState('') // filled when stored category is custom ("Others")

  const [products, setProducts] = useState<Array<{ product_id: string; product_name: string; category: string | null }>>([])
  const [categories, setCategories] = useState<string[]>([])
  const [salesReps, setSalesReps] = useState<Array<{ user_id: string; user_name: string }>>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Other samples for the same client (matched by party_name), excluding the one
  // being edited. Read-only — each row links out to its own View/Edit page.
  const [previousSamples, setPreviousSamples] = useState<Array<{
    sample_id: string
    party_name: string
    category: string | null
    product: { product_name: string } | null
    sample_submission_date: string | null
    output: string
  }>>([])

  // Load the sample + catalog (products, sales reps) and prefill every editable field.
  // Note: follow-up visits are intentionally NOT loaded/edited here — they stay
  // read-time-managed on the detail page (add-visit flow). PATCH never touches them.
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)

        const [sampleRes, prodRes, repsRes, allSamplesRes] = await Promise.all([
          fetch(`/api/samples/${sample_id}`),
          fetch('/api/products'),
          fetch('/api/users'),
          fetch('/api/samples')
        ])

        const sampleJson = await sampleRes.json()
        if (!sampleRes.ok) throw new Error(sampleJson.error || 'Failed to load sample')
        const sample = sampleJson.data

        const prodJson = await prodRes.json()
        const products = prodJson.data || []
        const repsJson = await repsRes.json()
        const reps = repsJson.data || []

        // Other samples for the same client: filter the full list by party_name,
        // excluding the sample currently being edited. Read-only here.
        let others: any[] = []
        if (allSamplesRes.ok) {
          const allSamplesJson = await allSamplesRes.json()
          const all = allSamplesJson.data || []
          others = all.filter(
            (s: any) =>
              s.sample_id !== sample_id &&
              (s.party_name ?? '') === (sample.party_name ?? '')
          )
        }

        if (cancelled) return

        setProducts(products)
        setSalesReps(reps)
        // Distinct categories drive the Category dropdown.
        const cats = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean) as string[]))
        setCategories(cats)

        // Resolve the stored category into the dropdown. If it isn't one of the
        // catalog's known categories (and isn't literally "Others"), treat it as a
        // custom category: select "Others" and place the stored text in the custom input.
        const storedCat = sample.category || ''
        const isKnown = cats.includes(storedCat)
        const isCustom = !!storedCat && storedCat !== 'Others' && !isKnown

        setFormData({
          party_name: sample.party_name ?? '',
          category: storedCat,
          poc_name: sample.poc_name ?? '',
          poc_contact: sample.poc_contact ?? '',
          designation: sample.designation ?? '',
          product_id: sample.product_id ?? '',
          sample_submission_date: (sample.sample_submission_date || '').slice(0, 10),
          location: sample.location ?? '',
          state: sample.state ?? '',
          next_visit_date: (sample.next_visit_date || '').slice(0, 10),
          sales_rep_id: sample.sales_rep_id ?? '',
          poc_category: sample.poc_category ?? '',
          output: sample.output || 'Pending'
        })
        setCustomCategory(isCustom ? storedCat : '')
        setPreviousSamples(others)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sample')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sample_id])

  // Handle text/select/textarea input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Category dropdown: "Others" reveals a free-text input for a custom category;
  // switching back to a normal category hides and clears that input.
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, category: value }))
    if (value !== 'Others') setCustomCategory('')
  }

  // Selecting a product stores its UUID and auto-fills its category
  // (category is denormalized onto the sample row — same as the create form).
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target
    const product = products.find(p => p.product_id === value)
    setFormData(prev => ({
      ...prev,
      product_id: value,
      category: product?.category || prev.category
    }))
  }

  // Save the edited fields via PATCH /api/samples/:id.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!formData.party_name || !formData.product_id || !formData.sample_submission_date) {
        throw new Error('Please fill in all required fields')
      }

      // When "Others" is selected, save the typed custom category text (not the
      // literal string "Others").
      const categoryToSave =
        formData.category === 'Others'
          ? (customCategory.trim() || null)
          : (formData.category || null)

      const res = await fetch(`/api/samples/${sample_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_name: formData.party_name,
          category: categoryToSave,
          poc_name: formData.poc_name || null,
          poc_contact: formData.poc_contact || null,
          designation: formData.designation || null,
          poc_category: formData.poc_category || null,
          product_id: formData.product_id,
          sample_submission_date: formData.sample_submission_date,
          sales_rep_id: formData.sales_rep_id || null,
          location: formData.location || null,
          state: formData.state || null,
          next_visit_date: formData.next_visit_date || null,
          output: formData.output || 'Pending'
        })
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update sample')

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSuccess(false)
    } finally {
      setSaving(false)
    }
  }

  // "Add Another Sample for this Client" — navigates to /samples/create prefilled
  // with this sample's client/shared info, reusing the create form's query-param
  // prefill (party_name, location, state, poc_name, poc_contact, designation).
  const handleAddAnother = () => {
    const params = new URLSearchParams()
    params.set('party_name', formData.party_name)
    if (formData.location) params.set('location', formData.location)
    if (formData.state) params.set('state', formData.state)
    if (formData.poc_name) params.set('poc_name', formData.poc_name)
    if (formData.poc_contact) params.set('poc_contact', formData.poc_contact)
    if (formData.designation) params.set('designation', formData.designation)
    router.push(`/samples/create?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm">Loading sample...</p>
      </div>
    )
  }
  if (error && !formData.party_name) {
    return <div className="text-center py-24 text-red-500">{error}</div>
  }

  return (
    <div className="py-6">
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={`/samples/${sample_id}`} className="text-gray-600 hover:text-gray-800 text-sm">
              ← Back to Sample
            </Link>
            <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900 mt-1">Edit Sample</h1>
          </div>
          <button
            type="button"
            onClick={handleAddAnother}
            className="btn btn-secondary text-sm px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            Add Another Sample for {formData.party_name || 'this Client'}
          </button>
        </div>
      </div>

      {error && <div className="bg-rose-100 border-2 border-rose-400 text-rose-800 px-4 py-3 rounded-md mb-4">{error}</div>}
      {success && <div className="bg-emerald-100 border-2 border-emerald-400 text-emerald-800 px-4 py-3 rounded-md mb-4">Sample updated successfully!</div>}

      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6 lg:max-w-5xl">
        {/* Customer */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Customer</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Client Name *</label>
              <input
                type="text"
                name="party_name"
                value={formData.party_name}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Sales Representative</label>
              <select
                name="sales_rep_id"
                value={formData.sales_rep_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select a sales rep</option>
                {salesReps.map(rep => (
                  <option key={rep.user_id} value={rep.user_id}>{rep.user_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className="input"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
                <option value="Others">Others</option>
              </select>
              {formData.category === 'Others' && (
                <input
                  type="text"
                  name="custom_category"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Type a custom category"
                  className="input mt-3"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Address"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select a state</option>
                {INDIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Point of Contact */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Point of Contact</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                name="poc_name"
                value={formData.poc_name}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contact (Phone/Email)</label>
              <input
                type="text"
                name="poc_contact"
                value={formData.poc_contact}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Designation</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">POC Category</label>
              <select
                name="poc_category"
                value={formData.poc_category}
                onChange={handleChange}
                className="input"
              >
                <option value="">Select a POC category</option>
                {POC_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Sample Details */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Sample Details</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Proposed Product *</label>
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleProductChange}
                required
                className="input"
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sample Submission Date *</label>
              <input
                type="date"
                name="sample_submission_date"
                value={formData.sample_submission_date}
                onChange={handleChange}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Next Visit Date</label>
              <input
                type="date"
                name="next_visit_date"
                value={formData.next_visit_date}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                name="output"
                value={formData.output}
                onChange={handleChange}
                className="input"
              >
                {VALID_OUTPUTS.map(status => (
                  <option key={status} value={status}>{OUTPUT_DISPLAY_TEXT[status]}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="p-2">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary w-full text-base px-4 py-3"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Previous Samples for this Client — read-only list, links out to each sample's own page */}
      <section className="bg-white rounded-lg p-6 mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">
          Previous Samples for {formData.party_name || 'this Client'}
        </h3>
        {previousSamples.length === 0 ? (
          <p className="text-gray-500 text-sm">No other samples for this client yet.</p>
        ) : (
          <div className="space-y-3">
            {previousSamples.map(s => (
              <div
                key={s.sample_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                  <span className="font-medium text-gray-900">{s.product?.product_name || '—'}</span>
                  <span className="text-gray-600">Category: {s.category || '—'}</span>
                  <span className="text-gray-600">Submitted: {formatDate(s.sample_submission_date)}</span>
                  <span className="text-gray-600">Status: {s.output || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/samples/${s.sample_id}`}
                    className="btn btn-secondary text-sm px-3 py-1.5"
                  >
                    View
                  </Link>
                  <Link
                    href={`/samples/${s.sample_id}/edit`}
                    className="btn btn-secondary text-sm px-3 py-1.5"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}