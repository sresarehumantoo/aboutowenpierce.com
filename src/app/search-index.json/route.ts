import { getPosts, getProjects } from '@/lib/content'
import type { SearchEntry } from '@/lib/search'

export const dynamic = 'force-static'

export function GET() {
  const entries: SearchEntry[] = [
    ...getPosts().map((post) => ({
      type: 'post' as const,
      slug: post.slug,
      title: post.title,
      summary: post.excerpt || '',
      date: post.publishedAt,
      body: post.content,
    })),
    ...getProjects().map((project) => ({
      type: 'project' as const,
      slug: project.slug,
      title: project.title,
      summary: project.description,
      date: project.completedAt,
      body: project.content,
    })),
  ]
  return Response.json(entries)
}
