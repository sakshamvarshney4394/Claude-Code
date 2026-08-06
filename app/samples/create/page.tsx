'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

// Products now live in the `products` table (seeded from lib/catalog.ts) and are
// referenced by their real UUID `product_id` — NOT by a free-text product name.
// This is what makes the product:products(*) join in the list/detail pages resolve.

export default function CreateSamplePage() {
  const [formData, setFormData] = useState({
    party_name: '',
    category: '',
    poc_name: '',
    poc_contact: '',
    designation: '',
    product_id: '',
    sample_submission_date: '',
    location: '',
    next_visit_date: '',
    sales_rep_id: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Products loaded from the API GET (product_id = UUID, product_name + category).
  // The dropdown options below are built from these so the submitted product_id is a real FK value.
  const [products, setProducts] = useState<Array<{ product_id: string; product_name: string; category: string | null }>>([])
  const [categories, setCategories] = useState<string[]>([])

  // Sales reps loaded from `/api/users` for the rep dropdown. PRE-AUTH: in v2 each
  // rep gets their own login and this dropdown is replaced by session-based attribution.
  const [salesReps, setSalesReps] = useState<Array<{ user_id: string; user_name: string }>>([])

  useEffect(() => {
    async function loadProducts() {
      try {
        // Products come from the API route (app/api/products) so the dropdown
        // options carry real product_id UUIDs.
        const res = await fetch('/api/products')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load products')

        const data = json.data || []
        setProducts(data)
        // Distinct categories drive the Category dropdown.
        setCategories(Array.from(new Set(data.map((p: any) => p.category).filter(Boolean) as string[])))
      } catch (err) {
        console.error('Failed to load products:', err instanceof Error ? err.message : err)
      }
    }
    loadProducts()
  }, [])

  // Load the rep list once on mount so the Sales Rep dropdown always has options.
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

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // When a product is selected, store its UUID and auto-fill its category.
  // (category is denormalized onto the sample row so the list/detail can show it
  // without a second join — kept in sync with products.category here.)
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target
    const product = products.find(p => p.product_id === value)
    setFormData(prev => ({
      ...prev,
      product_id: value,
      category: product?.category || prev.category
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.party_name || !formData.product_id || !formData.sample_submission_date) {
        throw new Error('Please fill in all required fields')
      }

      // Create via the API route so validation + auth checks happen server-side.
      const res = await fetch('/api/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_name: formData.party_name,
          category: formData.category || null,
          poc_name: formData.poc_name || null,
          poc_contact: formData.poc_contact || null,
          designation: formData.designation || null,
          product_id: formData.product_id,
          sample_submission_date: formData.sample_submission_date,
          // sales_rep_id comes from the rep dropdown (Step 5). POST stores it; it's
          // replaced by session-based attribution once per-rep auth ships in v2.
          sales_rep_id: formData.sales_rep_id || null,
          location: formData.location || null,
          next_visit_date: formData.next_visit_date || null
          // output defaults to 'Pending' per specification
        })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create sample')

      setSuccess(true)
      // Reset form after successful submission
      setFormData({
        party_name: '',
        category: '',
        poc_name: '',
        poc_contact: '',
        designation: '',
        product_id: '',
        sample_submission_date: '',
        sales_rep_id: '',
        location: '',
        next_visit_date: ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Sample</h1>
        <Link href="/samples" className="text-gray-600 hover:text-gray-800 text-sm">
          ← Back to All Samples
        </Link>
      </div>

      {error && <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
      {success && <div className="bg-emerald-100 border border-emerald-400 text-emerald-700 px-4 py-3 rounded-lg mb-4">Sample created successfully!</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-3xl divide-y divide-gray-100">
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">Customer</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Party Name *</label>
                <input
                  type="text"
                  name="party_name"
                  value={formData.party_name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2">Sales Rep</label>
                <select
                  name="sales_rep_id"
                  value={formData.sales_rep_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a sales rep</option>
                  {/* Reps loaded from /api/users (seeded identities). PRE-AUTH:
                      replaced by the logged-in account in v2. */}
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
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">Point of Contact</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  type="text"
                  name="poc_name"
                  value={formData.poc_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Contact (Phone/Email)</label>
                <input
                  type="text"
                  name="poc_contact"
                  value={formData.poc_contact}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">Sample Details</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Product *</label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleProductChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Next Visit Date</label>
                <input
                  type="date"
                  name="next_visit_date"
                  value={formData.next_visit_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 font-semibold"
          >
            {loading ? 'Creating...' : 'Create Sample'}
          </button>
        </div>
      </form>
    </div>
  )
}