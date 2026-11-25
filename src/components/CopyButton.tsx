'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, CopyIcon } from './Icons'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
  }

  return (
    <button type="button" className="code-copy" onClick={copy} aria-label={copied ? 'Copied' : 'Copy code'}>
      {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
