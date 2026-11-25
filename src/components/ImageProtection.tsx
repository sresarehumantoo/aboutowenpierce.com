'use client'

import { useEffect } from 'react'

export function ImageProtection() {
  useEffect(() => {
    // Check if element or its ancestors contain protected content
    function isProtectedElement(target: HTMLElement): boolean {
      // Direct image
      if (target.tagName === 'IMG') return true

      // Element inside an image (Next.js Image wrapper)
      if (target.closest('img')) return true

      // Hero sections with background images
      if (target.closest('.hero')) return true

      // Card images
      if (target.closest('.card-image')) return true

      // About page image
      if (target.closest('.about-image-wrapper')) return true

      // Any element with a background-image CSS property
      const style = window.getComputedStyle(target)
      if (style.backgroundImage && style.backgroundImage !== 'none') return true

      return false
    }

    // Prevent right-click context menu on protected elements
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (isProtectedElement(target)) {
        e.preventDefault()
        return false
      }
    }

    // Prevent drag and drop of images
    function handleDragStart(e: DragEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' || isProtectedElement(target)) {
        e.preventDefault()
        return false
      }
    }

    // Prevent keyboard shortcuts for saving
    function handleKeyDown(e: KeyboardEvent) {
      // Ctrl+S, Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const activeElement = document.activeElement as HTMLElement
        if (activeElement?.tagName === 'IMG' || activeElement === document.body) {
          e.preventDefault()
          return false
        }
      }
    }

    // Prevent double-click selection on images
    function handleSelectStart(e: Event) {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        e.preventDefault()
        return false
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('selectstart', handleSelectStart)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('selectstart', handleSelectStart)
    }
  }, [])

  return null
}
