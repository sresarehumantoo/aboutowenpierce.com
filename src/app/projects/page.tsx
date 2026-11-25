import { getProjects } from '@/lib/content'
import { ProjectCards } from '@/components/ProjectCards'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Projects',
  description: 'A showcase of my work and side projects.',
  path: '/projects/',
})

export default function ProjectsPage() {
  const projects = getProjects()

  return (
    <>
      <section className="hero hero-page" style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(/images/projects-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="container">
          <h1 style={{ color: '#fff' }}>Projects</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>A showcase of my work and side projects.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <ProjectCards projects={projects} columns={2} />
        </div>
      </section>
    </>
  )
}
