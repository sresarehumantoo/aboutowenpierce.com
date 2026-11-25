import { getProjects } from '@/lib/content'
import { ProjectCards } from '@/components/ProjectCards'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Projects',
  description: 'Security tooling and infrastructure I build and maintain.',
  path: '/projects/',
})

export default function ProjectsPage() {
  const projects = getProjects()
  const featured = projects.filter((project) => project.featured)
  const rest = projects.filter((project) => !project.featured)

  return (
    <>
      <section className="hero hero-page" style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(/images/projects-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="container">
          <h1 style={{ color: '#fff' }}>Projects</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Security tooling and infrastructure I build and maintain.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ProjectCards projects={featured} wide />
          {rest.length > 0 && (
            <>
              <h2 className="section-title projects-more">More projects</h2>
              <ProjectCards projects={rest} columns={3} />
            </>
          )}
        </div>
      </section>
    </>
  )
}
