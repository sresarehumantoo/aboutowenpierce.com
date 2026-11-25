'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { SearchIcon, CloseIcon, PenIcon, FolderIcon } from './Icons'
import { useDebounce } from '@/hooks/useDebounce'
import { loadSearchIndex, searchEntries, type SearchEntry } from '@/lib/search'

type SearchResponse = {
  posts: SearchEntry[]
  projects: SearchEntry[]
  totalPosts: number
  totalProjects: number
}

const DROPDOWN_LIMIT = 5

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Clear search state on route change. Adjusting state during render is the
  // supported way to respond to a changed value; an effect here would just
  // cause an extra render pass.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setQuery('')
    setResults(null)
    setIsOpen(false)
    setIsExpanded(false)
  }

  // Queries shorter than 2 chars are cleared eagerly by handleQueryChange, so
  // this effect only runs the search and never sets state synchronously.
  // A stale result is dropped if the debounced query changes mid-flight.
  useEffect(() => {
    const searchQuery = debouncedQuery.trim()
    if (searchQuery.length < 2) return

    let cancelled = false

    loadSearchIndex()
      .then((entries) => {
        if (cancelled) return
        const { posts, projects } = searchEntries(entries, searchQuery)
        setResults({
          posts: posts.slice(0, DROPDOWN_LIMIT),
          projects: projects.slice(0, DROPDOWN_LIMIT),
          totalPosts: posts.length,
          totalProjects: projects.length,
        })
        setIsOpen(true)
      })
      .catch((error) => console.error('Search error:', error))
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (value.trim().length >= 2) {
      setIsLoading(true)
    } else {
      setIsLoading(false)
      setResults(null)
      setIsOpen(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        if (isExpanded) {
          setIsExpanded(false)
          setQuery('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  // Close search on scroll
  useEffect(() => {
    if (!isOpen && !isExpanded) return

    const handleScroll = () => {
      setIsOpen(false)
      if (isExpanded) {
        setIsExpanded(false)
        setQuery('')
        setResults(null)
      }
      inputRef.current?.blur()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isOpen, isExpanded])

  // Add/remove class on body when search is expanded (for hiding nav on mobile)
  useEffect(() => {
    if (isExpanded) {
      document.body.classList.add('search-active')
    } else {
      document.body.classList.remove('search-active')
    }
    return () => {
      document.body.classList.remove('search-active')
    }
  }, [isExpanded])

  const handleMobileExpand = () => {
    setIsExpanded(true)
    // Focus immediately to keep it within the user gesture (required for mobile keyboard)
    inputRef.current?.focus()
    // Also retry after the CSS transition completes in case the input wasn't visible yet
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  const handleClose = () => {
    setIsExpanded(false)
    setIsOpen(false)
    setQuery('')
    setResults(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      router.push(`/search/?q=${encodeURIComponent(query.trim())}`)
      setIsOpen(false)
      if (isExpanded) {
        setIsExpanded(false)
      }
    }
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  const handleResultClick = () => {
    setIsOpen(false)
    setQuery('')
    if (isExpanded) {
      setIsExpanded(false)
    }
  }

  const hasResults = results && (results.posts.length > 0 || results.projects.length > 0)
  const showViewAll = results && (results.totalPosts > DROPDOWN_LIMIT || results.totalProjects > DROPDOWN_LIMIT)

  return (
    <div className={`search-container ${isExpanded ? 'expanded' : ''}`} ref={containerRef}>
      {/* Mobile: search icon button */}
      <button
        className={`search-mobile-toggle ${isExpanded ? 'active' : ''}`}
        onClick={handleMobileExpand}
        aria-label="Open search"
      >
        <SearchIcon size={18} />
      </button>

      {/* Search input wrapper */}
      <div className="search-input-wrapper">
        <SearchIcon size={18} className="search-input-icon" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          className="search-input"
          placeholder="Search..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {isExpanded && (
          <button
            className="search-close-button"
            onClick={handleClose}
            aria-label="Close search"
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div className="search-dropdown">
          {isLoading ? (
            <div className="search-loading">Searching...</div>
          ) : hasResults ? (
            <>
              {results.posts.length > 0 && (
                <div className="search-section">
                  <div className="search-section-header">
                    <PenIcon size={14} />
                    <span>Posts</span>
                  </div>
                  {results.posts.map((post) => (
                    <Link
                      key={post.slug}
                      href={`/blog/${post.slug}`}
                      className="search-result"
                      onClick={handleResultClick}
                    >
                      <span className="search-result-title">{post.title}</span>
                      {post.summary && (
                        <span className="search-result-excerpt">
                          {post.summary.slice(0, 80)}...
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {results.projects.length > 0 && (
                <div className="search-section">
                  <div className="search-section-header">
                    <FolderIcon size={14} />
                    <span>Projects</span>
                  </div>
                  {results.projects.map((project) => (
                    <Link
                      key={project.slug}
                      href={`/projects/${project.slug}`}
                      className="search-result"
                      onClick={handleResultClick}
                    >
                      <span className="search-result-title">{project.title}</span>
                      {project.summary && (
                        <span className="search-result-excerpt">
                          {project.summary.slice(0, 80)}...
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {showViewAll && (
                <Link
                  href={`/search/?q=${encodeURIComponent(query)}`}
                  className="search-view-all"
                  onClick={handleResultClick}
                >
                  View all results
                </Link>
              )}
            </>
          ) : query.trim().length >= 2 ? (
            <div className="search-no-results">No results found</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
