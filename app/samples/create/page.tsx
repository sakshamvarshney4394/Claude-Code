'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { INDIAN_STATES } from '@/lib/indian_states'
import { PRODUCT_CATALOG, getCategoryForProduct } from '@/lib/catalog'

// POC Category (Client Type) fixed options.
const POC_CATEGORIES = ['HORECA', 'QSR', 'Distributors', 'Exporters', 'Sweet Shops', 'Hotel']

// One repeatable sample-detail block. Multiple products can be checked per block.
// All products checked in a block share that block's submission date and next visit date.
type SampleBlock = {
  blockId: number
  product_ids: string[]
  sample_submission_date: string
  next_visit_date: string
}

function makeBlock(blockId: number): SampleBlock {
  return {
    blockId,
    product_ids: [],
    sample_submission_date: '',
    next_visit_date: ''
  }
}

function CreateSampleForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Shared client-level fields (one set, applied to every sample created).
  const [client, setClient] = useState({
    party_name: '',
    poc_name: '',
    poc_contact: '',
    designation: '',
    poc_category: '',
    location: '',
    state: '',
    sales_rep_id: ''
  })

  // Repeatable per-sample detail blocks.
  const [samples, setSamples] = useState<SampleBlock[]>(() => [makeBlock(1)])

  // Stable incrementing id for new blocks (so React keys don't shift on removal).
  const blockIdCounter = useRef(2)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Products loaded from the API GET (product_id = UUID, product_name, category).
  const [products, setProducts] = useState<Array<{ product_id: string; product_name: string; category: string | null }>>([])

  // Sales reps loaded from `/api/users` for the rep dropdown.
  const [salesReps, setSalesReps] = useState<Array<{ user_id: string; user_name: string }>>([])

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/products')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load products')
        setProducts(json.data || [])
      } catch (err) {
        console.error('Failed to load products:', err instanceof Error ? err.message : err)
      }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    async function loadSalesReps() {
      try {
        const res = await fetch('/api/users')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load sales reps')
        setSalesReps(json.data || [])
      } catch (err) {
        console.error('Failed to load sales reps:', err instanceof Error ? err.message : err)
      }
    }
    loadSalesReps()
  }, [])

  // Generic prefill from URL query params
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const keys = ['party_name', 'location', 'state', 'poc_name', 'poc_contact', 'designation']
    if (!keys.some(k => params.has(k))) return

    setClient(prev => ({
      ...prev,
      party_name: params.get('party_name') ?? '',
      location: params.get('location') ?? '',
      state: params.get('state') ?? '',
      poc_name: params.get('poc_name') ?? '',
      poc_contact: params.get('poc_contact') ?? '',
      designation: params.get('designation') ?? ''
    }))
    setSamples([makeBlock(1)])
    blockIdCounter.current = 2
    setError(null)
  }, [searchParams])

  // Update a shared client-level field.
  const handleClientChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setClient(prev => ({ ...prev, [name]: value }))
  }

  // Update a date field within one sample block.
  const handleBlockChange = (
    index: number,
    field: 'sample_submission_date' | 'next_visit_date',
    value: string
  ) => {
    setSamples(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }

  // Toggle a product checkbox in a sample block.
  const handleProductToggle = (blockIndex: number, productId: string) => {
    setSamples(prev =>
      prev.map((b, i) => {
        if (i !== blockIndex) return b
        const exists = b.product_ids.includes(productId)
        const updated = exists
          ? b.product_ids.filter(id => id !== productId)
          : [...b.product_ids, productId]
        return { ...b, product_ids: updated }
      })
    )
  }

  // Append a new blank sample-detail block
  const addSample = () => {
    setSamples(prev => [...prev, makeBlock(blockIdCounter.current++)])
  }

  // Remove a block. The first block (index 0) can never be removed.
  const removeSample = (index: number) => {
    if (index === 0) return
    setSamples(prev => prev.filter((_, i) => i !== index))
  }

  // Determine category for a product
  const categoryOfProduct = (product: { product_name: string; category: string | null }) =>
    getCategoryForProduct(product.product_name) || product.category || undefined

  // Handle form submission: single atomic POST /api/samples with all checked products
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Required shared field: Client Name.
      if (!client.party_name.trim()) {
        throw new Error('Please fill in all required fields: Client Name is required')
      }

      // Per-block validation
      for (let i = 0; i < samples.length; i++) {
        const b = samples[i]
        if (b.product_ids.length === 0) {
          throw new Error(`Sample Block ${i + 1}: Please select at least one product`)
        }
        if (!b.sample_submission_date) {
          throw new Error(`Sample Block ${i + 1}: Sample Submission Date is required`)
        }
      }

      // Build array of sample rows to insert
      const rowsToInsert = samples.flatMap(b =>
        b.product_ids.map(productId => {
          const product = products.find(p => p.product_id === productId)
          const category = product ? (categoryOfProduct(product) || null) : null
          return {
            party_name: client.party_name.trim(),
            category,
            poc_name: client.poc_name.trim() || null,
            poc_contact: client.poc_contact.trim() || null,
            designation: client.designation.trim() || null,
            poc_category: client.poc_category || null,
            product_id: productId,
            sample_submission_date: b.sample_submission_date,
            sales_rep_id: client.sales_rep_id || null,
            location: client.location.trim() || null,
            state: client.state || null,
            next_visit_date: b.next_visit_date || null
          }
        })
      )

      if (rowsToInsert.length === 0) {
        throw new Error('Please select at least one product')
      }

      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowsToInsert)
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create samples')
      }

      // Redirect immediately to samples list
      router.push('/samples')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900">Create New Sample</h1>
        <Link href="/samples" className="text-gray-600 hover:text-gray-800 text-sm">
          ← Back to All Samples
        </Link>
      </div>

      {error && (
        <div className="bg-rose-100 border-2 border-rose-400 text-rose-800 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6 lg:max-w-5xl">
        {/* Shared client-level fields — one set, applied to every sample below */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Client</h3>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Client Name *</label>
              <input
                type="text"
                name="party_name"
                value={client.party_name}
                onChange={handleClientChange}
                required
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Sales Representative</label>
              <select
                name="sales_rep_id"
                value={client.sales_rep_id}
                onChange={handleClientChange}
                className="input"
              >
                <option value="">Select a sales rep</option>
                {salesReps.map(rep => (
                  <option key={rep.user_id} value={rep.user_id}>
                    {rep.user_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">POC Name</label>
              <input
                type="text"
                name="poc_name"
                value={client.poc_name}
                onChange={handleClientChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">POC Contact</label>
              <input
                type="text"
                name="poc_contact"
                value={client.poc_contact}
                onChange={handleClientChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Designation</label>
              <input
                type="text"
                name="designation"
                value={client.designation}
                onChange={handleClientChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">POC Category</label>
              <select
                name="poc_category"
                value={client.poc_category}
                onChange={handleClientChange}
                className="input"
              >
                <option value="">Select a POC category</option>
                {POC_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={client.location}
                onChange={handleClientChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">State</label>
              <select
                name="state"
                value={client.state}
                onChange={handleClientChange}
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

        {/* Repeatable sample-detail blocks — each can contain multiple checked products */}
        {samples.map((block, index) => (
          <section key={block.blockId} className="bg-white rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Sample {index + 1}
              </h3>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeSample(index)}
                  className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                >
                  <X className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
            </div>

            {/* Checkbox product list grouped by the 4 categories in canonical catalog order */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Select Products *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PRODUCT_CATALOG.map(catalogCat => (
                  <div
                    key={catalogCat.category}
                    className="border border-gray-200 rounded-md p-3.5 bg-gray-50/50"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-2 mb-2 border-b border-gray-200">
                      {catalogCat.category}
                    </h4>
                    <div className="space-y-2">
                      {catalogCat.products.map(productName => {
                        const product = products.find(p => p.product_name === productName)
                        if (!product) return null
                        const isChecked = block.product_ids.includes(product.product_id)
                        return (
                          <label
                            key={product.product_id}
                            className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleProductToggle(index, product.product_id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{product.product_name}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {block.product_ids.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Select at least one product for this sample block.
                </p>
              )}
            </div>

            {/* Dates for this block */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Sample Submission Date *</label>
                <input
                  type="date"
                  name="sample_submission_date"
                  value={block.sample_submission_date}
                  onChange={e => handleBlockChange(index, 'sample_submission_date', e.target.value)}
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Next Visit Date</label>
                <input
                  type="date"
                  name="next_visit_date"
                  value={block.next_visit_date}
                  onChange={e => handleBlockChange(index, 'next_visit_date', e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Append a new blank sample block after this one. */}
            <div className="mt-5">
              <button
                type="button"
                onClick={addSample}
                className="inline-flex items-center gap-1.5 btn btn-secondary text-sm px-4 py-2"
              >
                <Plus className="w-3 h-3" /> Add Another Sample
              </button>
            </div>
          </section>
        ))}

        {/* Form submission buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push('/samples')}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Creating...' : 'Create Samples'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function CreateSamplePage() {
  return (
    <Suspense fallback={null}>
      <CreateSampleForm />
    </Suspense>
  )
}
