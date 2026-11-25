'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { PenIcon, FolderIcon } from '@/components/Icons'
import { formatDate } from '@/lib/format'
import { loadSearchIndex, normalizeQuery, searchEntries, type SearchEntry } from '@/lib/search'

const sectionHeadingStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  fontSize: '1.25rem',
  fontWeight: 600,
  marginBottom: '1.5rem',
  color: 'var(--color-text)',
} as const

export function SearchResults() {
  const query = normalizeQuery(useSearchParams().get('q') || '')
  const [entries, setEntries] = useState<SearchEntry[] | null>(null)

  useEffect(() => {
    loadSearchIndex()
      .then(setEntries)
      .catch((error) => console.error('Search error:', error))
  }, [])

  useEffect(() => {
    document.title = query ? `Search: ${query}` : 'Search'
  }, [query])

  const { posts, projects } = entries ? searchEntries(entries, query) : { posts: [], projects: [] }
  const totalResults = posts.length + projects.length

  return (
    <>
      <div className="post-header" style={{ paddingTop: '2rem', textAlign: 'left' }}>
        <h1 className="section-title">{query ? `Search results for "${query}"` : 'Search'}</h1>
        {query && entries && (
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            {totalResults} {totalResults === 1 ? 'result' : 'results'} found
          </p>
        )}
      </div>

      {!query ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Enter a search term to find posts and projects.</p>
      ) : !entries ? (
        <p style={{ color: 'var(--color-text-secondary)' }}>Searching...</p>
      ) : totalResults === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem' }}>
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
            Try a different search term or browse the <Link href="/blog">blog</Link> or{' '}
            <Link href="/projects">projects</Link>.
          </p>
        </div>
      ) : (
        <>
          {posts.length > 0 && (
            <section style={{ marginBottom: '3rem' }}>
              <h2 style={sectionHeadingStyle}>
                <PenIcon size={20} />
                Posts ({posts.length})
              </h2>
              <div className="card-grid cols-2">
                {posts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="card">
                    <div className="card-content">
                      <h3 className="card-title">{post.title}</h3>
                      {post.summary && <p className="card-excerpt">{post.summary}</p>}
                      {post.date && (
                        <div className="card-meta">
                          <span>{formatDate(post.date)}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {projects.length > 0 && (
            <section>
              <h2 style={sectionHeadingStyle}>
                <FolderIcon size={20} />
                Projects ({projects.length})
              </h2>
              <div className="card-grid cols-2">
                {projects.map((project) => (
                  <Link key={project.slug} href={`/projects/${project.slug}`} className="card">
                    <div className="card-content">
                      <h3 className="card-title">{project.title}</h3>
                      <p className="card-excerpt">{project.summary}</p>
                      {project.date && (
                        <div className="card-meta">
                          <span>{formatDate(project.date, 'long', false)}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  )
}
