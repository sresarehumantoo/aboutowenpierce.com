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
  canonicalUrl?: string
  project?: string
  content: string
}

export type ProjectLinks = {
  live?: string
  github?: string
  other?: { label: string; url: string }[]
}

export type ProjectStatus = 'active' | 'maintained' | 'archived'

export type Project = {
  slug: string
  title: string
  description: string
  techStack: string[]
  links: ProjectLinks
  featured: boolean
  status?: ProjectStatus
  license?: string
  privateSource: boolean
  completedAt: string
  featuredImage?: string
  demo?: { src: string; poster: string; alt: string }
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

const POST_KEYS = ['title', 'excerpt', 'publishedAt', 'categories', 'featuredImage', 'canonicalUrl', 'project', 'draft']
const PROJECT_KEYS = ['title', 'description', 'techStack', 'links', 'featured', 'status', 'license', 'privateSource', 'completedAt', 'featuredImage', 'demo', 'draft']
const LINK_KEYS = ['live', 'github', 'other']
const DEMO_KEYS = ['src', 'poster', 'alt']
const PROJECT_STATUSES: ProjectStatus[] = ['active', 'maintained', 'archived']

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

function publicFile(source: string, field: string, value: unknown): string {
  const file = requireString(source, field, value)
  if (!file.startsWith('/') || !fs.existsSync(path.join(PUBLIC_DIR, file))) {
    fail(source, `${field} ${file} is not a file under public/`)
  }
  return file
}

function optionalImage(source: string, value: unknown): string | undefined {
  return value === undefined ? undefined : publicFile(source, 'featuredImage', value)
}

function optionalStatus(source: string, value: unknown): ProjectStatus | undefined {
  if (value === undefined) return undefined
  if (!PROJECT_STATUSES.includes(value as ProjectStatus)) {
    fail(source, `"status" must be one of ${PROJECT_STATUSES.join(', ')}`)
  }
  return value as ProjectStatus
}

function optionalDemo(source: string, value: unknown): Project['demo'] {
  if (value === undefined) return undefined
  if (typeof value !== 'object' || value === null) fail(source, '"demo" must be an object with src, poster and alt')
  checkKeys(source, value, DEMO_KEYS)
  const demo = value as Record<string, unknown>
  return {
    src: publicFile(source, 'demo.src', demo.src),
    poster: publicFile(source, 'demo.poster', demo.poster),
    alt: requireString(source, 'demo.alt', demo.alt),
  }
}

function optionalProjectRef(source: string, value: unknown): string | undefined {
  if (value === undefined) return undefined
  const slug = requireString(source, 'project', value)
  if (!allProjects().some((project) => project.slug === slug)) fail(source, `"project" ${slug} is not a project slug`)
  return slug
}

function optionalCanonical(source: string, value: unknown): string | undefined {
  if (value === undefined) return undefined
  const url = requireString(source, 'canonicalUrl', value)
  if (!url.startsWith('https://')) fail(source, `canonicalUrl ${url} must be an absolute https URL`)
  return url
}

function checkBodyMedia(source: string, content: string) {
  const prose = content.replace(/^```[\s\S]*?^```/gm, '')
  for (const [, src] of prose.matchAll(/!\[[^\]]*\]\(\s*(\/[^\s)]+)/g)) {
    publicFile(source, 'image', src)
  }
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
      checkBodyMedia(source, content)
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
      canonicalUrl: optionalCanonical(source, data.canonicalUrl),
      project: optionalProjectRef(source, data.project),
      content,
    }))
    .sort((a, b) => byDateDesc(a.publishedAt, b.publishedAt))
  return postsCache
}

function allProjects(): Project[] {
  projectsCache ??= readCollection('projects', PROJECT_KEYS)
    .filter(({ data }) => !data.draft)
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
        status: optionalStatus(source, data.status),
        license: data.license === undefined ? undefined : requireString(source, 'license', data.license),
        privateSource: Boolean(data.privateSource),
        completedAt: requireDate(source, 'completedAt', data.completedAt),
        featuredImage: optionalImage(source, data.featuredImage),
        demo: optionalDemo(source, data.demo),
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

export function getPostsForProject(slug: string): Post[] {
  return allPosts().filter((post) => post.project === slug)
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
