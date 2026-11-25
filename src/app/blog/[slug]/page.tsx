import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getPosts } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { pageMetadata } from '@/lib/site'
import { Markdown } from '@/components/Markdown'
import { BlogPostJsonLd } from '@/components/JsonLd'

export const dynamicParams = false

type Props = {
  params: Promise<{ slug: string }>
}

async function loadPost(params: Props['params']) {
  const post = getPostBySlug((await params).slug)
  if (!post) notFound()
  return post
}

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await loadPost(params)
  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}/`,
    image: post.featuredImage,
    publishedTime: post.publishedAt,
    canonical: post.canonicalUrl,
  })
}

export default async function PostPage({ params }: Props) {
  const post = await loadPost(params)

  return (
    <article>
      <BlogPostJsonLd
        title={post.title}
        description={post.excerpt}
        slug={post.slug}
        publishedAt={post.publishedAt}
        image={post.featuredImage}
      />

      <header className="post-header container">
        <h1 className="post-title">{post.title}</h1>
      </header>

      <div className="post-content" style={{ paddingTop: 0 }}>
        <Markdown content={post.content} />
      </div>

      <footer className="post-footer">
        <div className="post-footer-meta">
          <time dateTime={post.publishedAt}>Published {formatDate(post.publishedAt)}</time>
        </div>
      </footer>
    </article>
  )
}
