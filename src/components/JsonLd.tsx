import { DEFAULT_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

type JsonLdProps = {
  data: Record<string, unknown>
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function WebsiteJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    author: {
      '@type': 'Person',
      name: SITE_NAME,
    },
  }
  return <JsonLd data={data} />
}

export function PersonJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_NAME,
    url: SITE_URL,
    image: new URL(DEFAULT_IMAGE.url, SITE_URL).href,
    jobTitle: 'Security Engineer',
    worksFor: {
      '@type': 'Organization',
      name: 'Ally Financial',
    },
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      name: 'Eastern Michigan University',
    },
    sameAs: [
      'https://github.com/SREsAreHumanToo',
      'https://www.linkedin.com/in/prodguardian/',
      'https://medium.com/@SREsAreHumanToo',
    ],
    knowsAbout: [
      'Security Operations',
      'Threat Detection',
      'Incident Response',
      'Penetration Testing',
      'Python',
      'JavaScript',
      'Go',
      'Terraform',
      'Ansible',
      'Docker',
      'Kubernetes',
      'Linux',
      'AWS',
    ],
  }
  return <JsonLd data={data} />
}

type BlogPostJsonLdProps = {
  title: string
  description?: string
  slug: string
  publishedAt?: string
  updatedAt?: string
  image?: string
}

export function BlogPostJsonLd({
  title,
  description,
  slug,
  publishedAt,
  updatedAt,
  image,
}: BlogPostJsonLdProps) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description || '',
    url: `${SITE_URL}/blog/${slug}/`,
    datePublished: publishedAt,
    dateModified: updatedAt || publishedAt,
    image: new URL(image || DEFAULT_IMAGE.url, SITE_URL).href,
    author: {
      '@type': 'Person',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: SITE_NAME,
      url: SITE_URL,
    },
  }
  return <JsonLd data={data} />
}
