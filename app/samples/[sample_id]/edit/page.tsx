'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { INDIAN_STATES } from '@/lib/indian_states'
import { PRODUCT_CATALOG, getCategoryForProduct } from '@/lib/catalog'

const VALID_OUTPUTS = ['Pending', 'Onboard', 'Not Interested', 'Interested but need time']

const OUTPUT_DISPLAY_TEXT: Record<string, string> = {
  Pending: 'Response Pending',
  Onboard: 'Onboarded Client',
  'Not Interested': 'Not Interested',
  'Interested but need time': 'Interested but need time',
}

const POC_CATEGORIES = ['HORECA', 'QSR', 'Distributors', 'Exporters', 'Sweet Shops', 'Hotel']

export default function EditSamplePage() {
  const { sample_id } = useParams<{ sample_id: string }>()
  const router = useRouter()

  const [formData, setFormData] = useState({
    party_name: '',
    poc_name: '',
    poc_contact: '',
    designation: '',
    poc_category: '',
    location: '',
    state: '',
    sales_rep_id: '',
    product_id: '',
    sample_submission_date: '',
    next_visit_date: '',
    output: 'Pending',
  })

  const [products, setProducts] = useState<Array<{ product_id: string; product_name: string; category: string | null }>>([])
  const [salesReps, setSalesReps] = useState<Array<{ user_id: string; user_name: string }>>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load sample data + products + sales reps
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)

        const [sampleRes, prodRes, repsRes] = await Promise.all([
          fetch(`/api/samples/${sample_id}`),
          fetch('/api/products'),
          fetch('/api/users'),
        ])

        const sampleJson = await sampleRes.json()
        if (!sampleRes.ok) throw new Error(sampleJson.error || 'Failed to load sample')
        const sample = sampleJson.data

        const prodJson = await prodRes.json()
        const activeProducts = prodJson.data || []

        const repsJson = await repsRes.json()
        const reps = repsJson.data || []

        if (cancelled) return

        // If sample's current product is soft-deleted, append it so it can still be displayed
        let allProducts = [...activeProducts]
        if (sample.product && !allProducts.some(p => p.product_id === sample.product.product_id)) {
          allProducts.push({
            product_id: sample.product.product_id,
            product_name: sample.product.product_name,
            category: sample.product.category,
          })
        }

        setProducts(allProducts)
        setSalesReps(reps)

        setFormData({
          party_name: sample.party_name ?? '',
          poc_name: sample.poc_name ?? '',
          poc_contact: sample.poc_contact ?? '',
          designation: sample.designation ?? '',
          poc_category: sample.poc_category ?? '',
          location: sample.location ?? '',
          state: sample.state ?? '',
          sales_rep_id: sample.sales_rep_id ?? '',
          product_id: sample.product_id ?? '',
          sample_submission_date: (sample.sample_submission_date || '').slice(0, 10),
          next_visit_date: (sample.next_visit_date || '').slice(0, 10),
          output: sample.output || 'Pending',
        })
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Single-select checkbox selection: checking any product selects it and unchecks previous
  const handleProductSelect = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      product_id: prev.product_id === productId ? '' : productId,
    }))
  }

  const categoryOfProduct = (product: { product_name: string; category: string | null }) =>
    getCategoryForProduct(product.product_name) || product.category || undefined

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (!formData.party_name.trim()) {
        throw new Error('Client Name is required')
      }
      if (!formData.product_id) {
        throw new Error('Please select a product')
      }
      if (!formData.sample_submission_date) {
        throw new Error('Sample Submission Date is required')
      }

      const selectedProduct = products.find(p => p.product_id === formData.product_id)
      const category = selectedProduct ? (categoryOfProduct(selectedProduct) || null) : null

      const res = await fetch(`/api/samples/${sample_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_name: formData.party_name.trim(),
          category,
          poc_name: formData.poc_name.trim() || null,
          poc_contact: formData.poc_contact.trim() || null,
          designation: formData.designation.trim() || null,
          poc_category: formData.poc_category || null,
          product_id: formData.product_id,
          sample_submission_date: formData.sample_submission_date,
          sales_rep_id: formData.sales_rep_id || null,
          location: formData.location.trim() || null,
          state: formData.state || null,
          next_visit_date: formData.next_visit_date || null,
          output: formData.output || 'Pending',
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update sample')

      // Return directly to view page
      router.push(`/samples/${sample_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500 gap-3">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm">Loading sample...</p>
      </div>
    )
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
        </div>
      </div>

      {error && (
        <div className="bg-rose-100 border-2 border-rose-400 text-rose-800 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-6 lg:max-w-5xl">
        {/* Client details */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">Client</h3>
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
                value={formData.poc_name}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">POC Contact</label>
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

            <div className="lg:col-span-2">
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

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div className="lg:col-span-2">
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

        {/* Product Selection (Single-select checkbox grouped by the 4 categories) */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">
            Product Selection *
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCT_CATALOG.map(catalogCat => {
              const catProducts = products.filter(
                p => categoryOfProduct(p) === catalogCat.category
              )

              return (
                <div
                  key={catalogCat.category}
                  className="border border-gray-200 rounded-md p-3.5 bg-gray-50/50"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 pb-2 mb-2 border-b border-gray-200">
                    {catalogCat.category}
                  </h4>
                  <div className="space-y-2">
                    {catProducts.length > 0 ? (
                      catProducts.map(product => {
                        const isChecked = formData.product_id === product.product_id
                        return (
                          <label
                            key={product.product_id}
                            className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleProductSelect(product.product_id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{product.product_name}</span>
                          </label>
                        )
                      })
                    ) : (
                      <span className="text-xs text-gray-400 italic">No products</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {!formData.product_id && (
            <p className="mt-2 text-xs text-rose-600">
              Please select a product.
            </p>
          )}
        </section>

        {/* Dates and Status */}
        <section className="bg-white rounded-lg p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-6">
            Dates & Status
          </h3>
          <div className="grid gap-5 lg:grid-cols-2">
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

        {/* Action buttons: Cancel & Save Changes */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.push(`/samples/${sample_id}`)}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
