'use client'

import { useEffect, useSyncExternalStore } from 'react'

// Client-only read of the URL shape, so it can be derived during render rather
// than assigned from an effect. A no-op subscribe is correct here: the pathname
// cannot change without a navigation, which remounts this boundary.
const noopSubscribe = () => () => {}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Check if this is a double-slash URL causing security errors
  const isDoubleSlashUrl = useSyncExternalStore(
    noopSubscribe,
    () => window.location.pathname.startsWith('//'),
    () => false,
  )

  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  useEffect(() => {
    if (!isDoubleSlashUrl) return

    // Attempt to redirect to the normalized path
    const normalizedPath = window.location.pathname.replace(/^\/+/, '/')
    const timer = setTimeout(() => {
      window.location.replace(normalizedPath + window.location.search + window.location.hash)
    }, 2000)
    return () => clearTimeout(timer)
  }, [isDoubleSlashUrl])

  return (
    <html lang="en">
      <head>
        <title>Error | Owen Pierce</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #18181b;
            color: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .error-page {
            text-align: center;
            padding: 2rem;
          }
          .error-code {
            font-size: 6rem;
            font-weight: 700;
            background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1;
            margin-bottom: 1rem;
          }
          .error-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .error-message {
            color: #a1a1aa;
            margin-bottom: 1.5rem;
          }
          .error-digest {
            font-family: monospace;
            font-size: 0.75rem;
            color: #71717a;
            margin-bottom: 1.5rem;
          }
          .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .error-button {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(135deg, #7c3aed 0%, #ec4899 100%);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .error-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
          }
          .error-button-secondary {
            background: #27272a;
          }
          .error-button-secondary:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          @media (prefers-color-scheme: light) {
            body {
              background: #ffffff;
              color: #111827;
            }
            .error-code {
              background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            }
            .error-message {
              color: #6b7280;
            }
            .error-digest {
              color: #9ca3af;
            }
            .error-button {
              background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            }
            .error-button:hover {
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            }
            .error-button-secondary {
              background: #f3f4f6;
              color: #111827;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="error-page">
          <h1 className="error-code">{isDoubleSlashUrl ? 'Oops!' : '500'}</h1>
          <h2 className="error-title">
            {isDoubleSlashUrl ? 'Invalid URL' : 'Something Went Wrong'}
          </h2>
          <p className="error-message">
            {isDoubleSlashUrl
              ? 'The URL you entered contains extra slashes. Redirecting you to the correct page...'
              : 'A critical error occurred. Please try again later.'}
          </p>
          {!isDoubleSlashUrl && error.digest && (
            <p className="error-digest">Error ID: {error.digest}</p>
          )}
          <div className="error-actions">
            {!isDoubleSlashUrl && (
              <button onClick={reset} className="error-button">
                Try Again
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- global-error has no router context */}
            <a href="/" className="error-button error-button-secondary">
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
