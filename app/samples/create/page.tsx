'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { CATEGORIES, PRODUCT_CATALOG, getCategoryForProduct } from '@/lib/catalog'

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
    next_visit_date: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // When a product is selected, auto-fill its respective category
  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target
    setFormData(prev => ({
      ...prev,
      product_id: value,
      category: value ? getCategoryForProduct(value) || prev.category : prev.category
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

      const { data, error } = await supabase
        .from('samples')
        .insert({
          party_name: formData.party_name,
          category: formData.category || null,
          poc_name: formData.poc_name || null,
          poc_contact: formData.poc_contact || null,
          designation: formData.designation || null,
          product_id: formData.product_id,
          sample_submission_date: formData.sample_submission_date,
          // sales_rep_id will be set from the logged-in account once auth is added (v2)
          location: formData.location || null,
          next_visit_date: formData.next_visit_date || null
          // output defaults to 'Pending' per specification
        })

      if (error) throw error

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

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(category => (
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
                  {PRODUCT_CATALOG.map(group => (
                    <optgroup key={group.category} label={group.category}>
                      {group.products.map(product => (
                        <option key={product} value={product}>
                          {product}
                        </option>
                      ))}
                    </optgroup>
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