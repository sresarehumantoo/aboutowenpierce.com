import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostBySlug, getPosts } from '@/lib/content'
import { formatDate } from '@/lib/format'
import { Markdown } from '@/components/Markdown'
import { BlogPostJsonLd } from '@/components/JsonLd'

export const dynamicParams = false

// output: 'export' rejects an empty generateStaticParams, so an empty collection
// exports a single placeholder route that renders the 404 page.
const EMPTY_SLUG = '_empty'

type Props = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  const params = getPosts().map((post) => ({ slug: post.slug }))
  return params.length > 0 ? params : [{ slug: EMPTY_SLUG }]
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    return {}
  }

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      ...(post.featuredImage && { images: [post.featuredImage] }),
    },
    twitter: {
      card: 'summary_large_image',
      ...(post.featuredImage && { images: [post.featuredImage] }),
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const post = getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  // Bodies migrated from the CMS carry their own H1; only add one when they don't.
  const hasOwnTitle = /^\s*# /.test(post.content)

  return (
    <article>
      <BlogPostJsonLd
        title={post.title}
        description={post.excerpt}
        slug={post.slug}
        publishedAt={post.publishedAt}
        image={post.featuredImage}
      />

      {!hasOwnTitle && (
        <header className="post-header container">
          <h1 className="post-title">{post.title}</h1>
        </header>
      )}

      <div className="post-content" style={{ paddingTop: hasOwnTitle ? '3rem' : 0 }}>
        <Markdown content={post.content} />
      </div>

      <footer className="post-footer">
        <div className="post-footer-meta">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>Published {formatDate(post.publishedAt)}</time>
          )}
        </div>
      </footer>
    </article>
  )
}
