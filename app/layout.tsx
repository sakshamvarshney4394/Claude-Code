import './globals.css'
import { Outfit } from 'next/font/google'
import Link from 'next/link'
import { Package, Plus, ClipboardList, FilePlus2 } from 'lucide-react'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata = {
  title: 'Sample Tracking System',
  description: 'Track product samples and follow-up visits'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${outfit.className} bg-gray-50 min-h-screen flex flex-col`}>
        {/* Sidebar (desktop only) */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden lg:block">
          <nav className="p-4">
            <Link href="/" className="flex items-center gap-2 mb-4 font-bold text-gray-900 hover:text-blue-600 transition-colors">
              <span className="w-7 h-7 rounded-md bg-blue-500 text-white flex items-center justify-center text-sm">
                <Package className="w-4 h-4" />
              </span>
              <span className="text-lg">Sample Tracking</span>
            </Link>
            <div className="space-y-2">
              <Link href="/samples" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                <ClipboardList className="w-4 h-4" />
                All Samples
              </Link>
              <Link href="/samples/create" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                <FilePlus2 className="w-4 h-4" />
                New Sample
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main container */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header (always visible) */}
          <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600 transition-colors">
                  <span className="w-7 h-7 rounded-md bg-blue-500 text-white flex items-center justify-center text-sm">
                    <Package className="w-4 h-4" />
                  </span>
                  <span className="text-lg">Sample Tracking</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/samples/create"
                  className="inline-flex items-center gap-1.5 bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-all duration-200 hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  New Sample
                </Link>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 pb-12 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>

          {/* Bottom navigation (mobile only) */}
          <nav className="bg-white border-t border-gray-200 px-4 py-3 lg:hidden">
            <div className="flex justify-between">
              <Link
                href="/samples"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <ClipboardList className="w-4 h-4" />
                All Samples
              </Link>
              <Link
                href="/samples/create"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <FilePlus2 className="w-4 h-4" />
                New Sample
              </Link>
            </div>
          </nav>
        </div>

        {/* Floating action button (mobile only) */}
        <div className="fixed bottom-6 right-6 lg:hidden">
          <Link
            href="/samples/create"
            className="w-14 h-14 bg-blue-500 text-white rounded-md flex items-center justify-center shadow-none hover:bg-blue-600 transition-all duration-200 hover:scale-105"
            aria-label="Create new sample"
          >
            <Plus className="w-6 h-6" />
          </Link>
        </div>

        {/* Footer (shared between layouts) */}
        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          Sample Tracking System · Naturin
        </footer>
      </body>
    </html>
  )
}