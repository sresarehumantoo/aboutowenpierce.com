'use client'

import { useState, useEffect } from 'react'

interface TypeWriterProps {
  text: string
  delay?: number
  className?: string
  style?: React.CSSProperties
}

export function TypeWriter({ text, delay = 100, className, style }: TypeWriterProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, delay)
      return () => clearTimeout(timeout)
    }
  }, [currentIndex, delay, text])

  return (
    <span className={className} style={style}>
      {displayText}
      <span className="typewriter-cursor">|</span>
    </span>
  )
}
