import { getPosts } from '@/lib/content'
import { PostCards } from '@/components/PostCards'
import { pageMetadata } from '@/lib/site'
import { PageHero } from '@/components/PageHero'

export const metadata = pageMetadata({
  title: 'Blog',
  description: 'Engineer first, writer... Sometimes! Excerpts on topics, trends, and a collection of mini-projects.',
  path: '/blog/',
})

export default function BlogPage() {
  const posts = getPosts()

  return (
    <>
      <PageHero
        title="Blog"
        subtitle="Engineer first, writer sometimes. Topics, trends, and mini-projects."
        image="/images/blog-hero.jpg"
      />

      <section className="section">
        <div className="container">
          <PostCards posts={posts} columns={2} />
        </div>
      </section>
    </>
  )
}
