'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'

const Logo3D = dynamic(() => import('./Logo3D').then(mod => ({ default: mod.Logo3D })), {
  ssr: false,
  loading: () => (
    <div className="logo-3d-container logo-3d-placeholder" />
  ),
})

export function Logo() {
  const [isSpinning, setIsSpinning] = useState(false)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Check initial theme
    const checkTheme = () => {
      const htmlElement = document.documentElement
      const dataTheme = htmlElement.getAttribute('data-theme')

      if (dataTheme === 'dark') {
        setIsDark(true)
      } else if (dataTheme === 'light') {
        setIsDark(false)
      } else {
        // Check system preference
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }

    checkTheme()

    // Watch for theme changes
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    // Watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkTheme)
    }
  }, [])

  const handleClick = () => {
    if (!isSpinning) {
      setIsSpinning(true)
    }
  }

  const handleSpinComplete = () => {
    setIsSpinning(false)
  }

  return (
    <Link href="/" className="logo" onClick={handleClick}>
      <Suspense fallback={<div className="logo-3d-container logo-3d-placeholder" />}>
        <Logo3D
          isDark={isDark}
          isSpinning={isSpinning}
          onSpinComplete={handleSpinComplete}
        />
      </Suspense>
    </Link>
  )
}
