import type { Metadata } from 'next'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Nav } from '@/components/Nav'
import { SearchBar } from '@/components/SearchBar'
import { ImageProtection } from '@/components/ImageProtection'
import { StickyHeader } from '@/components/StickyHeader'
import { GitHubIcon, LinkedInIcon, MediumIcon, EmailIcon, PenIcon, FolderIcon, UserIcon, ShieldIcon } from '@/components/Icons'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Home',
    template: '%s',
  },
  description: 'Security Engineer at Ally. Detection and response automation, least-privilege infrastructure for AI agents, and writing about security and home lab projects.',
  metadataBase: new URL('https://aboutowenpierce.com'),
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aboutowenpierce.com',
    siteName: 'Owen Pierce',
    title: 'Owen Pierce - Security Engineer',
    description: 'Security Engineer at Ally. Detection and response automation, least-privilege infrastructure for AI agents, and writing about security and home lab projects.',
    images: [
      {
        url: '/images/profile-placeholder.jpg',
        width: 1200,
        height: 630,
        alt: 'Owen Pierce - Security Engineer',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Owen Pierce - Security Engineer',
    description: 'Security Engineer at Ally. Detection and response automation, least-privilege infrastructure for AI agents, and writing about security and home lab projects.',
    images: ['/images/profile-placeholder.jpg'],
  },
}

export default function FrontendLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* GitHub Pages cannot send headers, so the CSP rides in a meta tag. frame-ancestors is
            ignored in meta form. unsafe-eval is kept from the server-side policy for Three.js. */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'"
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="alternate" type="application/rss+xml" title="Owen Pierce - Blog" href="/feed.xml" />
        <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#18181b" media="(prefers-color-scheme: dark)" />
        {/* Redirect double-slash URLs before React hydration causes security errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.pathname.indexOf('//') === 0) {
                window.location.replace(window.location.pathname.replace(/^\\/+/, '/'));
              }
            `,
          }}
        />
      </head>
      <body>
        <ImageProtection />
        <StickyHeader>
          <div className="container header-inner">
            <Nav />
            <SearchBar />
          </div>
        </StickyHeader>

        <main>{children}</main>

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
