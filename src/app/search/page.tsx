import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SearchResults } from '@/components/SearchResults'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search the site',
}

export default function SearchPage() {
  return (
    <div className="section">
      <div className="container">
        <Suspense fallback={null}>
          <SearchResults />
        </Suspense>
      </div>
    </div>
  )
}
