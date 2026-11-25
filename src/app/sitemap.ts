import type { MetadataRoute } from 'next'
import { getPosts, getProjects } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog/`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/projects/`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/about/`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact/`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/privacy/`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const postPages: MetadataRoute.Sitemap = getPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}/`,
    lastModified: post.publishedAt ? new Date(post.publishedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const projectPages: MetadataRoute.Sitemap = getProjects().map((project) => ({
    url: `${SITE_URL}/projects/${project.slug}/`,
    lastModified: project.completedAt ? new Date(project.completedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticPages, ...postPages, ...projectPages]
}
