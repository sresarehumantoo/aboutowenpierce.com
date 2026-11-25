#!/usr/bin/env node
// Export published Payload CMS content into the static content/ tree.
//
//   node scripts/export-payload.mjs --base-url https://192.0.2.10 --host aboutowenpierce.com --insecure
//   node scripts/export-payload.mjs --base-url http://localhost:9090
//
// Options:
//   --base-url URL   Payload origin (required)
//   --host NAME      Host header and TLS SNI to send, for reaching a vhost by IP
//   --insecure       Accept self-signed or mismatched TLS certificates
//   --force          Overwrite existing content files and downloaded media
//   --out DIR        Repo root to write into (default: the parent of scripts/)

import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values: args } = parseArgs({
  options: {
    'base-url': { type: 'string' },
    host: { type: 'string' },
    insecure: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    out: { type: 'string' },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

if (args.help || !args['base-url']) {
  console.error('usage: export-payload.mjs --base-url URL [--host NAME] [--insecure] [--force] [--out DIR]')
  process.exit(args.help ? 0 : 2)
}

const baseUrl = new URL(args['base-url'])
const outRoot = path.resolve(args.out ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const uploadsDir = path.join(outRoot, 'public/images/uploads')
const stats = { written: 0, skipped: 0, media: 0, warnings: 0 }

function warn(msg) {
  stats.warnings++
  console.warn(`warn: ${msg}`)
}

// node:http instead of fetch: global fetch silently drops a custom Host header
// and offers no per-request way to accept a self-signed certificate.
function get(url, redirects = 5) {
  const target = new URL(url)
  const sameOrigin = target.origin === baseUrl.origin
  const lib = target.protocol === 'https:' ? https : http
  const headers = { accept: '*/*' }
  if (sameOrigin && args.host) headers.host = args.host
  const opts = { headers }
  if (target.protocol === 'https:') {
    if (sameOrigin && args.host) opts.servername = args.host
    if (args.insecure) opts.rejectUnauthorized = false
  }
  return new Promise((resolve, reject) => {
    const req = lib.get(target, opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume()
        resolve(get(new URL(res.headers.location, target).href, redirects - 1))
        return
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const body = Buffer.concat(chunks)
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${target.href} -> HTTP ${res.statusCode}: ${body.toString('utf8', 0, 200)}`))
          return
        }
        resolve(body)
      })
    })
    req.setTimeout(30_000, () => req.destroy(new Error(`GET ${target.href} timed out`)))
    req.on('error', reject)
  })
}

async function fetchAll(collection, where = {}) {
  const docs = []
  for (let page = 1; ; page++) {
    const qs = new URLSearchParams({ depth: '1', limit: '500', page: String(page) })
    for (const [field, value] of Object.entries(where)) qs.set(`where[${field}][equals]`, value)
    const res = JSON.parse((await get(new URL(`/api/${collection}?${qs}`, baseUrl).href)).toString('utf8'))
    docs.push(...res.docs)
    if (!res.hasNextPage) return docs
  }
}

function writeOnce(file, data) {
  if (fs.existsSync(file) && !args.force) {
    stats.skipped++
    console.log(`skip (exists): ${path.relative(outRoot, file)}`)
    return
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, data)
  stats.written++
  console.log(`wrote: ${path.relative(outRoot, file)}`)
}

const mediaCache = new Map()

async function downloadMedia(url, filename) {
  const absolute = new URL(url, baseUrl).href
  if (mediaCache.has(absolute)) return mediaCache.get(absolute)
  const name = path.basename(decodeURIComponent(filename ?? new URL(absolute).pathname))
  const dest = path.join(uploadsDir, name)
  const publicPath = `/images/uploads/${encodeURIComponent(name)}`
  mediaCache.set(absolute, publicPath)
  if (fs.existsSync(dest) && !args.force) {
    console.log(`skip (exists): ${path.relative(outRoot, dest)}`)
    return publicPath
  }
  try {
    const body = await get(absolute)
    fs.mkdirSync(uploadsDir, { recursive: true })
    fs.writeFileSync(dest, body)
    stats.media++
    console.log(`media: ${path.relative(outRoot, dest)}`)
  } catch (err) {
    warn(`media download failed, keeping reference anyway: ${err.message}`)
  }
  return publicPath
}

async function mediaField(value, label) {
  if (!value) return undefined
  if (typeof value !== 'object') {
    warn(`${label}: media ${value} was not populated (depth=1 expected)`)
    return undefined
  }
  if (!value.url) {
    warn(`${label}: media ${value.id} has no url`)
    return undefined
  }
  return downloadMedia(value.url, value.filename)
}

// Markdown bodies may embed Payload media URLs; pull those files local too.
async function localizeMediaLinks(markdown) {
  const re = /(?:https?:\/\/[^\s)"'<>]+)?\/api\/media\/file\/[^\s)"'<>?#]+/g
  const found = [...new Set(markdown.match(re) ?? [])]
  for (const url of found) {
    const local = await downloadMedia(url)
    markdown = markdown.split(url).join(local)
  }
  return markdown
}

const TEXT_FORMAT = { bold: 1, italic: 2, strikethrough: 4, code: 16 }

function lexicalInline(nodes) {
  return (nodes ?? []).map(lexicalInlineNode).join('')
}

function lexicalInlineNode(node) {
  switch (node.type) {
    case 'text': {
      let t = node.text ?? ''
      const f = node.format ?? 0
      if (f & TEXT_FORMAT.code) return '`' + t + '`'
      if (f & TEXT_FORMAT.bold) t = `**${t}**`
      if (f & TEXT_FORMAT.italic) t = `*${t}*`
      if (f & TEXT_FORMAT.strikethrough) t = `~~${t}~~`
      return t
    }
    case 'linebreak':
      return '  \n'
    case 'tab':
      return '\t'
    case 'link':
    case 'autolink': {
      const url = node.fields?.url ?? node.url ?? ''
      return `[${lexicalInline(node.children)}](${url})`
    }
    default:
      return lexicalInline(node.children)
  }
}

function lexicalList(node, depth) {
  const indent = '  '.repeat(depth)
  let n = node.start ?? 1
  const lines = []
  for (const item of node.children ?? []) {
    const nested = (item.children ?? []).filter((c) => c.type === 'list')
    const inline = (item.children ?? []).filter((c) => c.type !== 'list')
    if (inline.length || !nested.length) {
      let marker = node.listType === 'number' ? `${n++}.` : '-'
      if (node.listType === 'check') marker += item.checked ? ' [x]' : ' [ ]'
      lines.push(`${indent}${marker} ${lexicalInline(inline)}`)
    }
    for (const sub of nested) lines.push(lexicalList(sub, depth + 1))
  }
  return lines.join('\n')
}

function lexicalBlock(node) {
  switch (node.type) {
    case 'paragraph':
      return lexicalInline(node.children)
    case 'heading':
      return `${'#'.repeat(Number(String(node.tag).slice(1)) || 2)} ${lexicalInline(node.children)}`
    case 'quote':
      return lexicalInline(node.children).split('\n').map((l) => `> ${l}`).join('\n')
    case 'list':
      return lexicalList(node, 0)
    case 'code':
      return '```' + (node.language ?? '') + '\n' + lexicalInline(node.children) + '\n```'
    case 'horizontalrule':
      return '---'
    case 'upload':
      return node.value?.url ? `![${node.value.alt ?? ''}](${node.value.url})` : ''
    default:
      return node.children ? lexicalInline(node.children) : ''
  }
}

function lexicalToMarkdown(value) {
  if (!value?.root?.children) return ''
  return value.root.children.map(lexicalBlock).filter((b) => b.trim() !== '').join('\n\n')
}

const yamlStr = (s) => JSON.stringify(String(s))
const yamlList = (xs) => `[${xs.map(yamlStr).join(', ')}]`
const day = (iso) => (iso ? String(iso).slice(0, 10) : undefined)

function frontmatter(fields) {
  const lines = ['---']
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue
    lines.push(`${k}: ${v}`)
  }
  lines.push('---', '')
  return lines.join('\n')
}

async function exportPosts() {
  const posts = await fetchAll('posts', { status: 'published' })
  for (const p of posts) {
    const categories = (p.categories ?? [])
      .map((c) => (typeof c === 'object' ? c.name : (warn(`post ${p.slug}: category ${c} not populated`), null)))
      .filter(Boolean)
    if (!p.publishedAt) warn(`post ${p.slug}: no publishedAt, falling back to createdAt`)
    const fm = frontmatter({
      title: yamlStr(p.title),
      excerpt: yamlStr(p.excerpt ?? ''),
      publishedAt: day(p.publishedAt ?? p.createdAt),
      categories: yamlList(categories),
      featuredImage: await mediaField(p.featuredImage, `post ${p.slug}`),
      draft: p.status === 'published' ? 'false' : 'true',
    })
    const body = await localizeMediaLinks(p.content ?? '')
    writeOnce(path.join(outRoot, 'content/posts', `${p.slug}.md`), fm + body.trimEnd() + '\n')
  }
  return posts.length
}

async function exportProjects() {
  const projects = await fetchAll('projects', { status: 'published' })
  for (const p of projects) {
    const links = {}
    if (p.links?.live) links.live = p.links.live
    if (p.links?.github) links.github = p.links.github
    if (p.links?.other?.length) links.other = p.links.other.map(({ label, url }) => ({ label, url }))
    const fm = frontmatter({
      title: yamlStr(p.title),
      description: yamlStr(p.description ?? ''),
      techStack: yamlList((p.techStack ?? []).map((t) => t.technology)),
      links: JSON.stringify(links),
      featured: p.featured ? 'true' : 'false',
      status: p.status,
      completedAt: day(p.completedAt),
      featuredImage: await mediaField(p.featuredImage, `project ${p.slug}`),
    })
    if (p.gallery?.length) warn(`project ${p.slug}: gallery (${p.gallery.length} images) is not part of the static schema, skipped`)
    const body = await localizeMediaLinks(p.content ?? '')
    writeOnce(path.join(outRoot, 'content/projects', `${p.slug}.md`), fm + body.trimEnd() + '\n')
  }
  return projects.length
}

async function exportExperience() {
  const items = await fetchAll('experience')
  items.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || String(b.startDate).localeCompare(String(a.startDate)))
  const out = []
  for (const [i, e] of items.entries()) {
    const entry = {
      title: e.title,
      company: e.company,
      ...(e.location ? { location: e.location } : {}),
      type: e.type,
      startDate: day(e.startDate),
      ...(e.endDate ? { endDate: day(e.endDate) } : {}),
      ...(e.current ? { current: true } : {}),
    }
    const description = await localizeMediaLinks(lexicalToMarkdown(e.description))
    if (description) entry.description = description
    entry.highlights = (e.highlights ?? []).map((h) => h.highlight)
    entry.skills = (e.skills ?? []).map((s) => s.skill)
    entry.order = e.order ?? i + 1
    if (e.logo) warn(`experience "${e.title}": logo is not part of the static schema, skipped`)
    out.push(entry)
  }
  writeOnce(path.join(outRoot, 'content/experience.json'), JSON.stringify(out, null, 2) + '\n')
  return items.length
}

try {
  const posts = await exportPosts()
  const projects = await exportProjects()
  const experience = await exportExperience()
  console.log(
    `\nposts ${posts}, projects ${projects}, experience ${experience}; ` +
      `files written ${stats.written}, skipped ${stats.skipped}, media downloaded ${stats.media}, warnings ${stats.warnings}`,
  )
  if (stats.skipped) console.log('re-run with --force to overwrite skipped files')
} catch (err) {
  console.error(`export failed: ${err.message}`)
  process.exit(1)
}
