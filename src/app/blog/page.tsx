import { getPosts } from '@/lib/content'
import { PostCards } from '@/components/PostCards'
import { pageMetadata } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Blog',
  description: 'Engineer first, writer... Sometimes! Excerpts on topics, trends, and a collection of mini-projects.',
  path: '/blog/',
})

export default function BlogPage() {
  const posts = getPosts()

  return (
    <>
      <section className="hero hero-page" style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(/images/blog-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div className="container">
          <h1 style={{ color: '#fff' }}>Blog</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Engineer first, writer sometimes. Topics, trends, and mini-projects.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <PostCards posts={posts} columns={2} />
        </div>
      </section>
    </>
  )
}
