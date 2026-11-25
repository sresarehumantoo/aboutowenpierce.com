import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Nav } from '@/components/Nav'
import { SearchBar } from '@/components/SearchBar'
import { StickyHeader } from '@/components/StickyHeader'
import { SwipeNav } from '@/components/SwipeNav'
import { GitHubIcon, LinkedInIcon, MediumIcon, EmailIcon, PenIcon, FolderIcon, UserIcon, ShieldIcon } from '@/components/Icons'
import { DEFAULT_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// 'unsafe-inline' scripts carry Next's hydration payload, since a static export has no
// per-request nonce. React only needs eval in development, for its debug callstacks.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_IMAGE],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* GitHub Pages cannot send headers, so the CSP rides in a meta tag (which ignores
            frame-ancestors). */}
        <meta httpEquiv="Content-Security-Policy" content={CONTENT_SECURITY_POLICY} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" type="application/rss+xml" title="Owen Pierce - Blog" href="/feed.xml" />
        <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#18181b" media="(prefers-color-scheme: dark)" />
        {/* Runs before first paint: redirects double-slash URLs, which break the router, and
            applies a stored theme so an explicit choice doesn't flash the system theme first. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.pathname.indexOf('//') === 0) {
                window.location.replace(window.location.pathname.replace(/^\\/+/, '/'));
              }
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <StickyHeader>
          <div className="container header-inner">
            <Nav />
            <SearchBar />
          </div>
        </StickyHeader>

        <SwipeNav />
        <main id="main" tabIndex={-1}>{children}</main>

        <footer className="footer">
          <div className="container footer-content">
            <div className="footer-top">
              <div className="footer-links">
                <Link href="/blog" className="footer-link">
                  <PenIcon size={16} />
                  <span>Blog</span>
                </Link>
                <Link href="/projects" className="footer-link">
                  <FolderIcon size={16} />
                  <span>Projects</span>
                </Link>
                <Link href="/contact" className="footer-link">
                  <EmailIcon size={16} />
                  <span>Contact</span>
                </Link>
                <Link href="/about" className="footer-link">
                  <UserIcon size={16} />
                  <span>About</span>
                </Link>
                <Link href="/privacy" className="footer-link">
                  <ShieldIcon size={16} />
                  <span>Privacy</span>
                </Link>
              </div>
              <div className="social-links">
                <ThemeToggle />
                <a
                  href="https://github.com/SREsAreHumanToo"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="social-link"
                >
                  <GitHubIcon size={20} />
                </a>
                <a
                  href="https://www.linkedin.com/in/prodguardian/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="social-link"
                >
                  <LinkedInIcon size={20} />
                </a>
                <a
                  href="https://medium.com/@SREsAreHumanToo"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Medium"
                  className="social-link"
                >
                  <MediumIcon size={20} />
                </a>
                <a
                  href="mailto:owenpierceee@gmail.com"
                  aria-label="Email"
                  className="social-link"
                >
                  <EmailIcon size={20} />
                </a>
              </div>
            </div>
            <div className="footer-bottom">
              <p className="copyright">
                &copy; {new Date().getFullYear()} Owen Pierce. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
