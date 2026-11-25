import type { MetadataRoute } from 'next'
import { getPosts, getProjects } from '@/lib/content'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts()
  const latestPost = posts[0]?.publishedAt

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: latestPost, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog/`, lastModified: latestPost, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/projects/`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/about/`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/contact/`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/privacy/`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}/`,
    lastModified: post.publishedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const projectPages: MetadataRoute.Sitemap = getProjects().map((project) => ({
    url: `${SITE_URL}/projects/${project.slug}/`,
    lastModified: project.completedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticPages, ...postPages, ...projectPages]
}
