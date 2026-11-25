'use client'

import { useEffect, useRef, useState } from 'react'

export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)
  const lastScrollY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true

      requestAnimationFrame(() => {
        const currentY = window.scrollY
        const delta = currentY - lastScrollY.current

        // Always show at top, hide on scroll down, show on scroll up
        if (currentY <= 10) {
          setHidden(false)
        } else if (currentY > 80 && delta > 5) {
          setHidden(true)
        } else if (delta < -5) {
          setHidden(false)
        }

        lastScrollY.current = currentY
        ticking.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`header ${hidden ? 'header-hidden' : ''}`}>
      {children}
    </header>
  )
}
