import Link from 'next/link'
import Image from 'next/image'
import type { Post } from '@/lib/content'
import { formatDate } from '@/lib/format'

interface Props {
  posts: Post[]
  columns?: 2 | 3
}

export function PostCards({ posts, columns = 3 }: Props) {
  if (posts.length === 0) {
    return (
      <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        No posts yet. Check back soon!
      </p>
    )
  }

  return (
    <div className={`card-grid cols-${columns}`}>
      {posts.map((post) => (
        <Link key={post.slug} href={`/blog/${post.slug}`} className="card">
          <div className="card-image">
            <Image
              src={post.featuredImage || '/images/code-screen.jpg'}
              alt={`${post.title} - blog post thumbnail`}
              width={columns === 2 ? 600 : 400}
              height={columns === 2 ? 375 : 250}
            />
          </div>
          <div className="card-content">
            {columns === 2 ? (
              <h2 className="card-title">{post.title}</h2>
            ) : (
              <h3 className="card-title">{post.title}</h3>
            )}
            {post.excerpt && <p className="card-excerpt">{post.excerpt}</p>}
            <div className="card-meta">
              {post.publishedAt && (
                <span>{formatDate(post.publishedAt, columns === 2 ? 'long' : 'short')}</span>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
