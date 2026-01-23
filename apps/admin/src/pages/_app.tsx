import type { AppProps } from 'next/app'
import Head from 'next/head'
import Link from 'next/link'
import '@/styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>City-Guided Admin</title>
        <meta name="description" content="Administration des POIs City-Guided" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900">City-Guided</span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-600">Admin</span>
              </Link>
              
              <nav className="flex gap-6">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  Zones
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </>
  )
}
