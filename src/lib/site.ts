import type { Metadata } from 'next'

export const SITE_URL = 'https://aboutowenpierce.com'

export const SITE_NAME = 'Owen Pierce'

export const SITE_TITLE = 'Owen Pierce - Security Engineer'

export const SITE_DESCRIPTION =
  'Security Engineer at Ally. Detection and response automation, least-privilege infrastructure for AI agents, and writing about security and home lab projects.'

export const DEFAULT_IMAGE = { url: '/images/profile.jpg', width: 900, height: 1200, alt: SITE_TITLE }

type PageMetadata = {
  title: string
  description: string
  path: string
  image?: string
  publishedTime?: string
}

// A page's openGraph replaces the layout's wholesale rather than merging, so
// every page gets the full set here, with its own URL as og:url and canonical.
export function pageMetadata({ title, description, path, image, publishedTime }: PageMetadata): Metadata {
  const images = image ? [image] : [DEFAULT_IMAGE]
  const shared = { title, description, url: path, siteName: SITE_NAME, locale: 'en_US', images }
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: publishedTime ? { ...shared, type: 'article', publishedTime } : { ...shared, type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}
