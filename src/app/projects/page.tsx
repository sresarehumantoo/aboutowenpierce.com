import { getProjects } from '@/lib/content'
import { ProjectCards } from '@/components/ProjectCards'
import { pageMetadata } from '@/lib/site'
import { PageHero } from '@/components/PageHero'

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
      <PageHero
        title="Projects"
        subtitle="Security tooling and infrastructure I build and maintain."
        image="/images/projects-hero.jpg"
      />

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
