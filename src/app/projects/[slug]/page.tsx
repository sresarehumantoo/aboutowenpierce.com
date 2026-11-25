import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectBySlug, getProjects } from '@/lib/content'
import { pageMetadata } from '@/lib/site'
import { Markdown } from '@/components/Markdown'
import { CoverImage } from '@/components/CoverImage'

export const dynamicParams = false

type Props = {
  params: Promise<{ slug: string }>
}

async function loadProject(params: Props['params']) {
  const project = getProjectBySlug((await params).slug)
  if (!project) notFound()
  return project
}

export function generateStaticParams() {
  return getProjects().map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await loadProject(params)
  return pageMetadata({
    title: project.title,
    description: project.description,
    path: `/projects/${project.slug}/`,
    image: project.featuredImage,
  })
}

export default async function ProjectPage({ params }: Props) {
  const project = await loadProject(params)

  return (
    <article>
      <header className="post-header container">
        <h1 className="post-title">{project.title}</h1>
      </header>

      {project.featuredImage && <CoverImage src={project.featuredImage} />}

      <div className="post-content" style={{ paddingTop: 0 }}>
        <Markdown content={project.content} />
      </div>

      <footer className="post-footer">
        {project.techStack.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tech Stack</h2>
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
