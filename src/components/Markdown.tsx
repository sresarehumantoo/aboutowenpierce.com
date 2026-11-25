import type { ReactElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Components } from 'react-markdown'
import { CopyButton } from './CopyButton'

// oneDark's comment gray (#5c6370) is 2.3:1 on its background; this is 5.5:1.
const codeStyle = {
  ...oneDark,
  comment: { ...oneDark.comment, color: '#9ca3af' },
  prolog: { ...oneDark.prolog, color: '#9ca3af' },
  cdata: { ...oneDark.cdata, color: '#9ca3af' },
}

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
    // Fenced blocks arrive as <pre><code>; a fence without a language has no className,
    // so the block/inline decision has to be made here rather than in `code`.
    pre({ children }) {
      const code = children as ReactElement<{ className?: string; children?: unknown }>
      const match = /language-(\w+)/.exec(code.props.className || '')
      const text = String(code.props.children).replace(/\n$/, '')
      return (
        <div className="code-block">
          <div className="code-block-bar">
            <span className="code-lang">{match ? match[1] : 'text'}</span>
            <CopyButton text={text} />
          </div>
          <SyntaxHighlighter
            style={codeStyle}
            language={match ? match[1] : 'text'}
            customStyle={{ margin: 0, borderRadius: '0 0 0.5rem 0.5rem' }}
            tabIndex={0}
          >
            {text}
          </SyntaxHighlighter>
        </div>
      )
    },
    code({ children }) {
      return <code className="inline-code">{children}</code>
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
        <div className="table-wrapper" tabIndex={0}>
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
