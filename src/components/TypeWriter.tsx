'use client'

import { useState, useEffect } from 'react'

interface TypeWriterProps {
  text: string
  delay?: number
  className?: string
  style?: React.CSSProperties
}

export function TypeWriter({ text, delay = 100, className, style }: TypeWriterProps) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const step = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? text.length : 1
    let i = 0
    const interval = setInterval(() => {
      i += step
      setCount(i)
      if (i >= text.length) clearInterval(interval)
    }, delay)
    return () => clearInterval(interval)
  }, [delay, text])

  // The full text is in the DOM from the first (static) render so crawlers and screen
  // readers get the real heading; the animated copy is decorative.
  return (
    <span className={className} style={style}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span className="typewriter-cursor">|</span>
      </span>
    </span>
  )
}
