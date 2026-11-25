import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchResults } from '@/components/SearchResults'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the site',
  robots: { index: false },
}

export default function SearchPage() {
  return (
    <div className="section">
      <div className="container">
        <Suspense fallback={<div className="search-results" />}>
          <SearchResults />
        </Suspense>
      </div>
    </div>
  )
}
