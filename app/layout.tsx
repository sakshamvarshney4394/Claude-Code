import './globals.css'
import { Outfit } from 'next/font/google'
import Link from 'next/link'
import { Package, Plus, ClipboardList, BarChart3 } from 'lucide-react'

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
        {/* Single top navigation bar (desktop shows inline links; mobile keeps the same compact bar).
            The desktop-only sidebar was removed — it duplicated this header. */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <span className="w-7 h-7 rounded-md bg-blue-500 text-white flex items-center justify-center text-sm">
                  <Package className="w-4 h-4" />
                </span>
                <span className="text-lg">Sample Tracking</span>
              </Link>
              {/* Desktop-only inline nav (New Sample is the top-right button — kept single) */}
              <nav className="hidden lg:flex items-center gap-1">
                <Link href="/samples" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                  <ClipboardList className="w-4 h-4" />
                  All Samples
                </Link>
                <Link href="/analytics" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Link>
              </nav>
            </div>
            <Link
              href="/samples/create"
              className="hidden lg:inline-flex items-center gap-1.5 bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-all duration-200 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              New Sample
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 pb-12 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Bottom navigation (mobile only).
            NOTE: the app's only /analytics link used to live in the `hidden lg:flex`
            header nav above, so Analytics was completely unreachable on a phone —
            the page worked, there was just no way to navigate to it. It belongs here.
            pr-20 keeps these links clear of the floating New Sample button, which is
            fixed at bottom-6 right-6 and would otherwise sit on top of them. */}
        <nav className="bg-white border-t border-gray-200 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2 pr-20">
            <Link
              href="/samples"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <ClipboardList className="w-4 h-4" />
              All Samples
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>
          </div>
        </nav>

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