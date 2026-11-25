import { getPosts } from '@/lib/content'
import { SITE_DESCRIPTION, SITE_URL } from '@/lib/site'

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeCdata(str: string): string {
  return str.replace(/]]>/g, ']]]]><![CDATA[>')
}

export function buildRss(channelLink: string, selfPath: string): Response {
  const items = getPosts({ limit: 50 })
    .map((post) => {
      const pubDate = post.publishedAt ? new Date(post.publishedAt).toUTCString() : new Date().toUTCString()
      const link = `${SITE_URL}/blog/${escapeXml(post.slug)}/`
      return `
    <item>
      <title><![CDATA[${escapeCdata(post.title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(post.excerpt || '')}]]></description>
    </item>`
    })
    .join('')

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Owen Pierce - Blog</title>
    <link>${channelLink}</link>
    <description>${SITE_DESCRIPTION}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}${selfPath}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(rss, { headers: { 'Content-Type': 'application/xml' } })
}
