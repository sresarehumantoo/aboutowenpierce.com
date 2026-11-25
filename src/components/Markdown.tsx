'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'

interface MarkdownProps {
  content: string
}

// Prevent XSS via javascript: and other dangerous URL protocols
function isSafeUrl(url: string): boolean {
  if (!url) return false
  const trimmed = url.trim().toLowerCase()
  // Block dangerous protocols
  if (trimmed.startsWith('javascript:')) return false
  if (trimmed.startsWith('vbscript:')) return false
  if (trimmed.startsWith('data:text/html')) return false
  return true
}

export function Markdown({ content }: MarkdownProps) {
  if (!content) return null

  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !match && !className

      if (isInline) {
        return (
          <code className="inline-code" {...props}>
            {children}
          </code>
        )
      }

      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match ? match[1] : 'text'}
          PreTag="div"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    },
    a({ href, children, ...props }) {
      // Sanitize href to prevent javascript: XSS
      const sanitizedHref = href && isSafeUrl(href) ? href : '#'
      const isExternal = sanitizedHref?.startsWith('http')
      return (
        <a
          href={sanitizedHref}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
        </a>
      )
    },
    table({ children, ...props }) {
      return (
        <div className="table-wrapper">
          <table {...props}>{children}</table>
        </div>
      )
    },
    img({ src, alt, ...props }) {
      // Sanitize src to prevent javascript: XSS
      // src can be string or Blob, only validate strings
      const srcString = typeof src === 'string' ? src : ''
      const sanitizedSrc = srcString && isSafeUrl(srcString) ? srcString : ''
      if (!sanitizedSrc) return null
      return (
        <figure className="markdown-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- dynamic markdown images */}
          <img src={sanitizedSrc} alt={alt || ''} {...props} />
          {alt && <figcaption>{alt}</figcaption>}
        </figure>
      )
    },
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
