import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export type Post = {
  slug: string
  title: string
  excerpt?: string
  publishedAt?: string
  categories: string[]
  featuredImage?: string
  content: string
}

export type ProjectLinks = {
  live?: string
  github?: string
  other?: { label: string; url: string }[]
}

export type Project = {
  slug: string
  title: string
  description: string
  techStack: string[]
  links: ProjectLinks
  featured: boolean
  status?: string
  completedAt?: string
  featuredImage?: string
  content: string
}

export type Experience = {
  title: string
  company: string
  location?: string
  type: string
  startDate: string
  endDate?: string
  current?: boolean
  description?: string
  highlights: string[]
  skills: string[]
  order?: number
}

// js-yaml turns unquoted YYYY-MM-DD into a Date; normalize back to the plain string.
function toDateString(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && value) return value
  return undefined
}

function readCollection(dir: string) {
  const fullDir = path.join(CONTENT_DIR, dir)
  if (!fs.existsSync(fullDir)) return []
  return fs
    .readdirSync(fullDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(fullDir, file), 'utf8'))
      return { slug: file.replace(/\.md$/, ''), data, content }
    })
}

function byDateDesc(a?: string, b?: string) {
  return (b || '').localeCompare(a || '')
}

let postsCache: Post[] | undefined
let projectsCache: Project[] | undefined

function allPosts(): Post[] {
  postsCache ??= readCollection('posts')
    .filter(({ data }) => !data.draft)
    .map(({ slug, data, content }) => ({
      slug,
      title: String(data.title ?? slug),
      excerpt: data.excerpt || undefined,
      publishedAt: toDateString(data.publishedAt),
      categories: Array.isArray(data.categories) ? data.categories.map(String) : [],
      featuredImage: data.featuredImage || undefined,
      content,
    }))
    .sort((a, b) => byDateDesc(a.publishedAt, b.publishedAt))
  return postsCache
}

function allProjects(): Project[] {
  projectsCache ??= readCollection('projects')
    .filter(({ data }) => !data.draft && data.status !== 'draft')
    .map(({ slug, data, content }) => ({
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ''),
      techStack: Array.isArray(data.techStack) ? data.techStack.map(String) : [],
      links: data.links ?? {},
      featured: Boolean(data.featured),
      status: data.status,
      completedAt: toDateString(data.completedAt),
      featuredImage: data.featuredImage || undefined,
      content,
    }))
    .sort((a, b) => byDateDesc(a.completedAt, b.completedAt))
  return projectsCache
}

export function getPosts(options?: { limit?: number }): Post[] {
  return allPosts().slice(0, options?.limit)
}

export function getPostBySlug(slug: string): Post | null {
  return allPosts().find((post) => post.slug === slug) ?? null
}

export function getProjects(options?: { limit?: number; featured?: boolean }): Project[] {
  const projects = options?.featured ? allProjects().filter((p) => p.featured) : allProjects()
  return projects.slice(0, options?.limit)
}

export function getProjectBySlug(slug: string): Project | null {
  return allProjects().find((project) => project.slug === slug) ?? null
}

export function getExperience(): Experience[] {
  const file = path.join(CONTENT_DIR, 'experience.json')
  if (!fs.existsSync(file)) return []
  const entries = JSON.parse(fs.readFileSync(file, 'utf8')) as Experience[]
  return entries
    .map((e) => ({ ...e, highlights: e.highlights ?? [], skills: e.skills ?? [] }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byDateDesc(a.startDate, b.startDate))
}
