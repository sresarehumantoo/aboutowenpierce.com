import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Oops!</h2>
        <p className="error-message">
          Sorry, we&apos;re having trouble finding that. Would you like to return home?
        </p>
        <Link href="/" className="error-button">
          Go Home
        </Link>
      </div>
    </div>
  )
}
