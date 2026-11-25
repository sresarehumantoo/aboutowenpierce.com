import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getPosts, getProjectBySlug } from '@/lib/content'
import { formatDate, readingMinutes } from '@/lib/format'
import { pageMetadata } from '@/lib/site'
import { Markdown } from '@/components/Markdown'
import { BlogPostJsonLd } from '@/components/JsonLd'
import { CoverImage } from '@/components/CoverImage'

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
  const project = post.project ? getProjectBySlug(post.project) : null

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
        <p className="post-meta">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          <span aria-hidden="true">&middot;</span>
          <span>{readingMinutes(post.content)} min read</span>
        </p>
      </header>

      {post.featuredImage && <CoverImage src={post.featuredImage} />}

      <div className="post-content" style={{ paddingTop: 0 }}>
        <Markdown content={post.content} />
      </div>

      {project && (
        <footer className="post-footer">
          <p className="post-project">
            Part of <Link href={`/projects/${project.slug}`}>{project.title}</Link>: {project.description}
          </p>
        </footer>
      )}
    </article>
  )
}
