import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sample Tracking System',
  description: 'Track product samples and follow-up visits',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen flex flex-col`}>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <a href="/" className="flex items-center gap-2 font-bold text-gray-900 hover:text-blue-600 transition-colors">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm">📦</span>
                <span className="text-lg">Sample Tracking</span>
              </a>
              <div className="hidden sm:flex items-center gap-1">
                <a href="/samples" className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                  All Samples
                </a>
                <a href="/samples/create" className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
                  New Sample
                </a>
              </div>
            </div>
            <a
              href="/samples/create"
              className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              + New Sample
            </a>
          </nav>
        </header>

        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          Sample Tracking System · Naturin
        </footer>
      </body>
    </html>
  )
}
