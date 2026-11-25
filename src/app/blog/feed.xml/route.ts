import { buildRss } from '@/lib/rss'
import { SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export function GET() {
  return buildRss(`${SITE_URL}/blog/`, '/blog/feed.xml')
}
