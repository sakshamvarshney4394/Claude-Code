'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { INDIAN_STATES } from '@/lib/indian_states'
import { PRODUCT_CATALOG, getCategoryForProduct } from '@/lib/catalog'

// Fixed Category options derived from PRODUCT_CATALOG (single source of truth).
// "Others" reveals a per-block custom-text input — kept from the earlier session.
const CATEGORIES = PRODUCT_CATALOG.map(c => c.category)

// POC Category (Client Type) fixed options.
const POC_CATEGORIES = ['HORECA', 'QSR', 'Distributors', 'Exporters', 'Sweet Shops', 'Hotel']

// One repeatable sample-detail block. Category/Product/Dates only — the
// client-level fields are shared across all blocks and not repeated here.
type SampleBlock = {
  blockId: number
  category: string
  customCategory: string // free-text when Category === 'Others'
  product_id: string
  sample_submission_date: string
  next_visit_date: string
}

function makeBlock(blockId: number): SampleBlock {
  return {
    blockId,
    category: '',
    customCategory: '',
    product_id: '',
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

  // Products loaded from the API GET (product_id = UUID, product_name). The
  // dropdown options carry real product_id UUIDs for FK integrity.
  const [products, setProducts] = useState<Array<{ product_id: string; product_name: string; category: string | null }>>([])

  // Sales reps loaded from `/api/users` for the rep dropdown. PRE-AUTH: replaced
  // by session-based attribution in v2.
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

  // NOTE — Category <-> Product used to be synced by two useEffects here. They
  // fought each other and broke the filter:
  //
  //   Effect A ("auto-fill category from product") reset `category` to '' on any
  //   block whose `product_id` was still empty. Its dep array contained
  //   `samples.map(b => b.product_id)`, a fresh array on every render, so it ran
  //   after EVERY render. Picking a category therefore wrote the category, the
  //   effect immediately wiped it back to '', and `filteredProducts('')` fell
  //   through to its "no category selected -> show everything" branch. Net
  //   effect: the Category dropdown appeared to reset itself and the Proposed
  //   Product dropdown listed all ~60 products regardless of category.
  //
  // Both directions are now handled in the change handlers below, where the user's
  // intent is unambiguous, so neither field can clobber the other.

  // Generic prefill from URL query params (unchanged mechanism from earlier
  // session). Used by a future Edit page — works for ANY page that links into
  // /samples/create?party_name=...&location=...&state=...&poc_name=...&
  // poc_contact=...&designation=...
  // Prefills ONLY the shared client-level fields; the first sample block stays blank.
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
    // Reset to a single blank sample block for the new entry.
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

  // Update a single field within one sample block.
  const handleBlockChange = (
    index: number,
    field: keyof SampleBlock,
    value: string
  ) => {
    setSamples(prev => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)))
  }

  // The category a product belongs to.
  //
  // PRODUCT_CATALOG is consulted first, deliberately: the Category dropdown's
  // options are built from PRODUCT_CATALOG, so resolving through it guarantees
  // that any catalogued product matches an option that actually exists in the
  // dropdown. `products.category` from the database is the fallback, which
  // covers a product that was added to the table but not to the catalog.
  const categoryOfProduct = (product: { product_name: string; category: string | null }) =>
    getCategoryForProduct(product.product_name) || product.category || undefined

  // Category dropdown per block. Selecting "Others" reveals a free-text input;
  // switching back to a normal category hides and clears that input.
  //
  // Also drops a product that doesn't belong to the newly chosen category —
  // otherwise the Product dropdown would show a selection that its own option
  // list no longer contains, which renders as a blank select.
  const handleBlockCategoryChange = (index: number, value: string) => {
    setSamples(prev =>
      prev.map((b, i) => {
        if (i !== index) return b

        let product_id = b.product_id
        // 'Others' and the blank option place no constraint on the product.
        if (product_id && value && value !== 'Others') {
          const product = products.find(p => p.product_id === product_id)
          if (!product || categoryOfProduct(product) !== value) product_id = ''
        }

        return {
          ...b,
          category: value,
          customCategory: value !== 'Others' ? '' : b.customCategory,
          product_id,
        }
      })
    )
  }

  // Product dropdown per block. Picking a product auto-fills its category, so
  // the form still works for someone who goes product-first and ignores the
  // Category dropdown entirely.
  //
  // Guard: a user who chose "Others" and typed a custom category keeps it — the
  // product's own category must not overwrite deliberate free text.
  const handleBlockProductChange = (index: number, productId: string) => {
    setSamples(prev =>
      prev.map((b, i) => {
        if (i !== index) return b
        if (!productId) return { ...b, product_id: '' }

        const product = products.find(p => p.product_id === productId)
        const resolved = product ? categoryOfProduct(product) : undefined

        // Only adopt a category the Category dropdown can actually display. A
        // stored `products.category` that isn't in PRODUCT_CATALOG would other-
        // wise leave the select with no matching <option> and render blank.
        const displayable = resolved && CATEGORIES.includes(resolved) ? resolved : undefined

        const keepCustom = b.category === 'Others' && b.customCategory.trim() !== ''
        const category = displayable && !keepCustom ? displayable : b.category

        return { ...b, product_id: productId, category }
      })
    )
  }

  // Append a new blank sample-detail block (client fields are shared, not repeated).
  const addSample = () => {
    setSamples(prev => [...prev, makeBlock(blockIdCounter.current++)])
  }

  // Remove a block. The first block (index 0) can never be removed.
  const removeSample = (index: number) => {
    if (index === 0) return
    setSamples(prev => prev.filter((_, i) => i !== index))
  }

  // When "Others" is the selected category for a block, save the typed custom
  // text (not the literal string "Others"). Blank custom text falls back to null.
  const categoryToSave = (block: SampleBlock): string | null =>
    block.category === 'Others'
      ? (block.customCategory.trim() || null)
      : (block.category || null)

  // The options for one block's Proposed Product dropdown, narrowed to the
  // selected category. No category (or "Others") means no constraint, so the
  // full catalog is offered.
  const filteredProducts = (selectedCategory: string | null, allProducts: Array<{ product_id: string; product_name: string; category: string | null }>) => {
    if (!selectedCategory || selectedCategory === 'Others') return allProducts
    return allProducts.filter(product => categoryOfProduct(product) === selectedCategory)
  }

  // Build the POST body for one block, merging the shared client-level fields.
  const buildPayload = (block: SampleBlock) => ({
    party_name: client.party_name,
    category: categoryToSave(block),
    poc_name: client.poc_name || null,
    poc_contact: client.poc_contact || null,
    designation: client.designation || null,
    poc_category: client.poc_category || null,
    product_id: block.product_id,
    sample_submission_date: block.sample_submission_date,
    sales_rep_id: client.sales_rep_id || null,
    location: client.location || null,
    state: client.state || null,
    next_visit_date: block.next_visit_date || null
    // output defaults to 'Pending' per specification
  })

  // Handle form submission: create one sample per block, all sharing the
  // client-level fields. Sequential calls to POST /api/samples. On any failure,
  // show which block failed and DO NOT redirect (user keeps their entries).
  // On full success, redirect immediately to the samples list.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Required shared field: Client Name.
      if (!client.party_name) {
        throw new Error('Please fill in all required fields: Client Name is required')
      }

      // Per-block required fields: Product + Sample Submission Date.
      for (let i = 0; i < samples.length; i++) {
        const b = samples[i]
        const missing: string[] = []
        if (!b.product_id) missing.push('Proposed Product')
        if (!b.sample_submission_date) missing.push('Sample Submission Date')
        if (missing.length) {
          throw new Error(
            `Sample ${i + 1} is missing required fields: ${missing.join(', ')}`
          )
        }
      }

      // Create each block sequentially. If one fails, surface it clearly and stop
      // (already-created blocks remain in the DB; entered values are preserved).
      for (let i = 0; i < samples.length; i++) {
        const res = await fetch('/api/samples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(samples[i]))
        })
        const json = await res.json()
        if (!res.ok) {
          throw new Error(`Sample ${i + 1} failed to save: ${json.error || 'Unknown error'}`)
        }
      }

      // All created — go straight to the list, no success screen.
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

        {/* Repeatable sample-detail blocks — each becomes its own row */}
        {samples.map((block, index) => {
          // Narrowed once per block, then reused for both the options and the
          // "category has no products" hint below.
          const productOptions = filteredProducts(block.category, products)
          return (
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

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  name="category"
                  value={block.category}
                  onChange={e => handleBlockCategoryChange(index, e.target.value)}
                  className="input"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                  <option value="Others">Others</option>
                </select>
                {/* Custom category text input — shown only when "Others" is selected. */}
                {block.category === 'Others' && (
                  <input
                    type="text"
                    value={block.customCategory}
                    onChange={e => handleBlockChange(index, 'customCategory', e.target.value)}
                    placeholder="Type a custom category"
                    className="input mt-3"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Proposed Product *</label>
                <select
                  name="product_id"
                  value={block.product_id}
                  onChange={e => handleBlockProductChange(index, e.target.value)}
                  required
                  className="input"
                >
                  <option value="">Select a product</option>
                  {productOptions.map(product => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name}
                    </option>
                  ))}
                </select>
                {/* A category whose products aren't in the DB yet would otherwise
                    look like an empty, unexplained dropdown on a required field. */}
                {block.category && block.category !== 'Others' && productOptions.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700">
                    No products are listed under “{block.category}” yet. Pick another category, or
                    choose “Others” to see the full list.
                  </p>
                )}
              </div>

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
          )
        })}

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

// useSearchParams (for the generic prefill) must resolve inside a Suspense
// boundary, or the production build fails to prerender this route.
export default function CreateSamplePage() {
  return (
    <Suspense fallback={null}>
      <CreateSampleForm />
    </Suspense>
  )
}