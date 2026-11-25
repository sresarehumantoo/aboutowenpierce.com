import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/site'

// This page moved to the blog. GitHub Pages can't send a server redirect, so
// the old URL keeps a stub that refreshes to the post.
const TARGET = '/blog/building-a-production-grade-self-hosted-blog/'

export const metadata: Metadata = {
  title: 'Moved: Building a Production-Grade Self-Hosted Blog',
  alternates: { canonical: `${SITE_URL}${TARGET}` },
  robots: { index: false, follow: true },
}

export default function MovedProjectPage() {
  return (
    <section className="post-header container">
      <meta httpEquiv="refresh" content={`0; url=${TARGET}`} />
      <h1 className="post-title">This page has moved</h1>
      <p className="post-meta">
        <Link href={TARGET}>Building a Production-Grade Self-Hosted Blog</Link>&nbsp;is now a blog post.
      </p>
    </section>
  )
}
