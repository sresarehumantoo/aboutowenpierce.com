import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const PUBLIC_DIR = path.join(process.cwd(), 'public')

export type Post = {
  slug: string
  title: string
  excerpt: string
  publishedAt: string
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
  completedAt: string
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

const POST_KEYS = ['title', 'excerpt', 'publishedAt', 'categories', 'featuredImage', 'draft']
const PROJECT_KEYS = ['title', 'description', 'techStack', 'links', 'featured', 'status', 'completedAt', 'featuredImage', 'draft']
const LINK_KEYS = ['live', 'github', 'other']

// Frontmatter typos fail the build instead of silently dropping a field.
function fail(source: string, message: string): never {
  throw new Error(`content/${source}: ${message}`)
}

function checkKeys(source: string, value: object, allowed: string[]) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) fail(source, `unknown frontmatter key(s): ${unknown.join(', ')}`)
}

function requireString(source: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) fail(source, `"${field}" must be a non-empty string`)
  return value
}

// js-yaml turns unquoted YYYY-MM-DD into a UTC Date; normalize back to the plain string.
function requireDate(source: string, field: string, value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  fail(source, `"${field}" must be a YYYY-MM-DD date`)
}

function stringList(source: string, field: string, value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    fail(source, `"${field}" must be a list of strings`)
  }
  return value
}

function optionalImage(source: string, value: unknown): string | undefined {
  if (value === undefined) return undefined
  const image = requireString(source, 'featuredImage', value)
  if (!image.startsWith('/') || !fs.existsSync(path.join(PUBLIC_DIR, image))) {
    fail(source, `featuredImage ${image} is not a file under public/`)
  }
  return image
}

function readCollection(dir: string, allowedKeys: string[]) {
  const fullDir = path.join(CONTENT_DIR, dir)
  return fs
    .readdirSync(fullDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const source = `${dir}/${file}`
      const slug = file.replace(/\.md$/, '')
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(source, 'file name must be a lowercase-hyphenated slug')
      const { data, content } = matter(fs.readFileSync(path.join(fullDir, file), 'utf8'))
      checkKeys(source, data, allowedKeys)
      return { source, slug, data, content }
    })
}

function byDateDesc(a: string, b: string) {
  return b.localeCompare(a)
}

let postsCache: Post[] | undefined
let projectsCache: Project[] | undefined

function allPosts(): Post[] {
  postsCache ??= readCollection('posts', POST_KEYS)
    .filter(({ data }) => !data.draft)
    .map(({ source, slug, data, content }) => ({
      slug,
      title: requireString(source, 'title', data.title),
      excerpt: requireString(source, 'excerpt', data.excerpt),
      publishedAt: requireDate(source, 'publishedAt', data.publishedAt),
      categories: stringList(source, 'categories', data.categories),
      featuredImage: optionalImage(source, data.featuredImage),
      content,
    }))
    .sort((a, b) => byDateDesc(a.publishedAt, b.publishedAt))
  return postsCache
}

function allProjects(): Project[] {
  projectsCache ??= readCollection('projects', PROJECT_KEYS)
    .filter(({ data }) => !data.draft && data.status !== 'draft')
    .map(({ source, slug, data, content }) => {
      const links: ProjectLinks = data.links ?? {}
      checkKeys(source, links, LINK_KEYS)
      return {
        slug,
        title: requireString(source, 'title', data.title),
        description: requireString(source, 'description', data.description),
        techStack: stringList(source, 'techStack', data.techStack),
        links,
        featured: Boolean(data.featured),
        status: data.status,
        completedAt: requireDate(source, 'completedAt', data.completedAt),
        featuredImage: optionalImage(source, data.featuredImage),
        content,
      }
    })
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
  const entries = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, 'experience.json'), 'utf8')) as Experience[]
  return entries
    .map((e) => ({ ...e, highlights: e.highlights ?? [], skills: e.skills ?? [] }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || byDateDesc(a.startDate, b.startDate))
}
