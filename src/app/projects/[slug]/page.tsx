import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectBySlug, getProjects } from '@/lib/content'
import { Markdown } from '@/components/Markdown'

export const dynamicParams = false

// output: 'export' rejects an empty generateStaticParams, so an empty collection
// exports a single placeholder route that renders the 404 page.
const EMPTY_SLUG = '_empty'

type Props = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  const params = getProjects().map((project) => ({ slug: project.slug }))
  return params.length > 0 ? params : [{ slug: EMPTY_SLUG }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    return {}
  }

  return {
    title: project.title,
    description: project.description,
  }
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  const hasOwnTitle = /^\s*# /.test(project.content)

  return (
    <article>
      {!hasOwnTitle && (
        <header className="post-header container">
          <h1 className="post-title">{project.title}</h1>
        </header>
      )}

      <div className="post-content" style={{ paddingTop: hasOwnTitle ? '3rem' : 0 }}>
        <Markdown content={project.content} />
      </div>

      <footer className="post-footer">
        {project.techStack.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tech Stack</h4>
            <div className="tags">
              {project.techStack.map((tech) => (
                <span key={tech} className="tag">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/projects" className="btn btn-outline">
            &larr; Back to Projects
          </Link>
          {project.links.live && (
            <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              View Live
            </a>
          )}
          {project.links.github && (
            <a href={project.links.github} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              GitHub
            </a>
          )}
          {project.links.other?.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              {link.label}
            </a>
          ))}
        </div>
      </footer>
    </article>
  )
}
