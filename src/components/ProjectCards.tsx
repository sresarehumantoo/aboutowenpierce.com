import Link from 'next/link'
import Image from 'next/image'
import type { Project } from '@/lib/content'

interface Props {
  projects: Project[]
  columns?: 2 | 3
}

export function ProjectCards({ projects, columns = 3 }: Props) {
  if (projects.length === 0) {
    return (
      <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        No projects yet. Check back soon!
      </p>
    )
  }

  return (
    <div className={`card-grid cols-${columns}`}>
      {projects.map((project) => (
        <Link key={project.slug} href={`/projects/${project.slug}`} className="card">
          <div className="card-image">
            <Image
              src={project.featuredImage || '/images/laptop-code.jpg'}
              alt={`${project.title} - project thumbnail`}
              width={1200}
              height={630}
            />
          </div>
          <div className="card-content">
            {columns === 2 ? (
              <h2 className="card-title">{project.title}</h2>
            ) : (
              <h3 className="card-title">{project.title}</h3>
            )}
            <p className="card-excerpt">{project.description}</p>
            {project.techStack.length > 0 && (
              <div className="tags" style={columns === 2 ? { marginTop: '1rem' } : undefined}>
                {project.techStack.slice(0, columns === 2 ? undefined : 4).map((tech) => (
                  <span key={tech} className="tag">
                    {tech}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
