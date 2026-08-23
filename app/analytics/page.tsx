'use client'

import { useState } from 'react'
import ProductPerformance from '@/app/components/analytics/ProductPerformance'
import SalesRepPerformance from '@/app/components/analytics/SalesRepPerformance'

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'products' | 'reps'>('products')

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-gray-900">
          Analytics Dashboard
        </h1>
        <div className="flex items-center gap-3">
          {/* Back to samples link would go here if needed */}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('products')}
          className={`${activeTab === 'products' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 text-sm font-medium`}
        >
          Product Performance
        </button>
        <button
          onClick={() => setActiveTab('reps')}
          className={`${activeTab === 'reps' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 text-sm font-medium`}
        >
          Sales Rep Performance
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'products' ? (
        <ProductPerformance />
      ) : (
        <SalesRepPerformance />
      )}
    </div>
  )
}