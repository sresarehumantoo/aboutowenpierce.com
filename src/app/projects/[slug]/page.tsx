import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostsForProject, getProjectBySlug, getProjects } from '@/lib/content'
import { formatDate } from '@/lib/format'
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

// The demo sits after the opening section, so the cover and the video are not stacked.
function splitAfterIntro(markdown: string): [string, string] {
  const sections = markdown.split(/^(?=## )/m)
  if (sections.length < 3) return [markdown, '']
  return [sections.slice(0, 2).join(''), sections.slice(2).join('')]
}

export default async function ProjectPage({ params }: Props) {
  const project = await loadProject(params)
  const posts = getPostsForProject(project.slug)
  const [intro, rest] = project.demo ? splitAfterIntro(project.content) : [project.content, '']

  return (
    <article>
      <header className="post-header project-header container">
        <h1 className="post-title">{project.title}</h1>
        <p className="project-lede">{project.description}</p>
        {(project.status || project.license || project.privateSource) && (
          <p className="project-facts">
            {project.status && <span className={`status-badge status-${project.status}`}>{project.status}</span>}
            {project.license && <span>{project.license}</span>}
            {project.privateSource && <span>Source: private</span>}
          </p>
        )}
        {(project.links.github || project.links.live || project.links.other) && (
          <div className="project-actions">
            {project.links.github && (
              <a href={project.links.github} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                View on GitHub
              </a>
            )}
            {project.links.live && (
              <a href={project.links.live} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                View Live
              </a>
            )}
            {project.links.other?.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                {link.label}
              </a>
            ))}
          </div>
        )}
        {project.techStack.length > 0 && (
          <div className="tags project-tags">
            {project.techStack.map((tech) => (
              <span key={tech} className="tag">
                {tech}
              </span>
            ))}
          </div>
        )}
      </header>

      {project.featuredImage && <CoverImage src={project.featuredImage} />}

      <div className="post-content" style={{ paddingTop: 0 }}>
        <Markdown content={intro} />
        {project.demo && (
          <figure className="project-demo">
            <video
              src={project.demo.src}
              poster={project.demo.poster}
              aria-label={project.demo.alt}
              controls
              muted
              playsInline
              preload="none"
            />
          </figure>
        )}
        <Markdown content={rest} />
      </div>

      {posts.length > 0 && (
        <section className="project-writing" aria-labelledby="writing-heading">
          <h2 id="writing-heading">Writing about {project.title}</h2>
          <ul>
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                <p>{post.excerpt}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="post-footer">
        <Link href="/projects" className="btn btn-outline">
          &larr; Back to Projects
        </Link>
      </footer>
    </article>
  )
}
