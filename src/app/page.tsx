import Link from 'next/link'
import { getPosts, getProjects } from '@/lib/content'
import { HeroSection } from '@/components/HeroSection'
import { WebsiteJsonLd } from '@/components/JsonLd'
import { PostCards } from '@/components/PostCards'
import { ProjectCards } from '@/components/ProjectCards'

export default function HomePage() {
  const posts = getPosts({ limit: 3 })
  const projects = getProjects({ limit: 3, featured: true })

  return (
    <>
      <WebsiteJsonLd />
      <HeroSection />

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Recent Posts</h2>
            <Link href="/blog" className="btn btn-outline">
              View All
            </Link>
          </div>
          <PostCards posts={posts} columns={3} />
        </div>
      </section>

      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Featured Projects</h2>
            <Link href="/projects" className="btn btn-outline">
              View All
            </Link>
          </div>
          <ProjectCards projects={projects} columns={3} />
        </div>
      </section>
    </>
  )
}
