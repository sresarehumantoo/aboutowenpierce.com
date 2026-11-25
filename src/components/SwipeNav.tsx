'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { navLinks } from './Nav'

const TOUCH_QUERY = '(hover: none) and (pointer: coarse)'
// iOS Safari and Android gesture navigation own swipes that start this close to an edge.
const EDGE_PX = 32
const MIN_DX = 80
const MAX_MS = 600

function blocksSwipe(target: EventTarget | null) {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.matches('input, textarea, select, canvas, [contenteditable]')) return true
    const { overflowX } = getComputedStyle(el)
    if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) return true
  }
  return false
}

export function SwipeNav() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Detail pages are excluded: they carry wide code blocks and tables, and an accidental
    // swipe there would throw away the reader's place.
    const index = navLinks.findIndex((link) => link.href === (pathname.replace(/\/$/, '') || '/'))
    if (index === -1 || !window.matchMedia(TOUCH_QUERY).matches) return

    let start: { x: number; y: number; t: number } | null = null

    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      start = null
      if (
        e.touches.length !== 1 ||
        touch.clientX < EDGE_PX ||
        touch.clientX > window.innerWidth - EDGE_PX ||
        (window.visualViewport?.scale ?? 1) > 1 ||
        document.body.classList.contains('search-active') ||
        blocksSwipe(e.target)
      ) return
      start = { x: touch.clientX, y: touch.clientY, t: e.timeStamp }
    }

    const onMove = (e: TouchEvent) => {
      if (e.touches.length > 1) start = null
    }

    const onEnd = (e: TouchEvent) => {
      if (!start) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - start.x
      const dy = touch.clientY - start.y
      const elapsed = e.timeStamp - start.t
      start = null
      if (Math.abs(dx) < MIN_DX || Math.abs(dx) < 2.5 * Math.abs(dy) || elapsed > MAX_MS) return
      if (window.getSelection()?.isCollapsed === false) return
      const next = navLinks[index + (dx < 0 ? 1 : -1)]
      if (next) router.push(next.href)
    }

    const onCancel = () => { start = null }

    const opts = { passive: true }
    document.addEventListener('touchstart', onStart, opts)
    document.addEventListener('touchmove', onMove, opts)
    document.addEventListener('touchend', onEnd, opts)
    document.addEventListener('touchcancel', onCancel, opts)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onCancel)
    }
  }, [pathname, router])

  return null
}
