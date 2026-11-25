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
    name: 'Owen Pierce',
    url: 'https://aboutowenpierce.com',
    description: 'Security Engineer at Ally. Detection and response automation, least-privilege infrastructure for AI agents, and writing about security and home lab projects.',
    author: {
      '@type': 'Person',
      name: 'Owen Pierce',
    },
  }
  return <JsonLd data={data} />
}

export function PersonJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Owen Pierce',
    url: 'https://aboutowenpierce.com',
    image: 'https://aboutowenpierce.com/images/profile.jpg',
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
    url: `https://aboutowenpierce.com/blog/${slug}`,
    datePublished: publishedAt,
    dateModified: updatedAt || publishedAt,
    image: image || 'https://aboutowenpierce.com/images/profile.jpg',
    author: {
      '@type': 'Person',
      name: 'Owen Pierce',
      url: 'https://aboutowenpierce.com',
    },
    publisher: {
      '@type': 'Person',
      name: 'Owen Pierce',
      url: 'https://aboutowenpierce.com',
    },
  }
  return <JsonLd data={data} />
}
