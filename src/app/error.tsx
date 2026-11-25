'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">500</h1>
        <h2 className="error-title">Oops!</h2>
        <p className="error-message">
          Sorry, we hit a snag in our wiring. Please try again later.
        </p>
        <div className="error-actions">
          <button onClick={reset} className="error-button">
            Try Again
          </button>
          <Link href="/" className="error-button error-button-secondary">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  )
}
