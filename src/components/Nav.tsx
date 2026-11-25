'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { PenIcon, FolderIcon, UserIcon, EmailIcon, HomeIcon } from './Icons'

const Logo3D = dynamic(() => import('./Logo3D').then(mod => ({ default: mod.Logo3D })), {
  ssr: false,
  loading: () => (
    <div className="logo-3d-container logo-3d-placeholder" />
  ),
})

const navLinks = [
  { href: '/', label: 'Home', icon: HomeIcon, isLogo: true },
  { href: '/blog', label: 'Blog', icon: PenIcon },
  { href: '/projects', label: 'Projects', icon: FolderIcon },
  { href: '/contact', label: 'Contact', icon: EmailIcon },
  { href: '/about', label: 'About', icon: UserIcon },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const navRef = useRef<HTMLElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 })
  const [isSpinning, setIsSpinning] = useState(false)
  const [isDark, setIsDark] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Check if we're on a detail page (e.g. /blog/some-slug or /projects/some-slug)
  const isDetailPage = (href: string) => {
    if (href === '/blog' || href === '/projects') {
      const segments = pathname.split('/').filter(Boolean)
      return segments[0] === href.slice(1) && segments.length > 1
    }
    return false
  }

  const handleNavClick = useCallback((e: React.MouseEvent, href: string) => {
    const isAtTop = window.scrollY < 10

    if (isActive(href) && !isAtTop) {
      // Same page, not at top — scroll to top
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (isDetailPage(href) && isAtTop) {
      // Detail page, already at top — go to listing
      e.preventDefault()
      router.push(href)
      return
    }
  }, [pathname, router])

  const getActiveIndex = () => {
    return navLinks.findIndex((link) => isActive(link.href))
  }

  // Theme detection for Logo3D
  useEffect(() => {
    const checkTheme = () => {
      const htmlElement = document.documentElement
      const dataTheme = htmlElement.getAttribute('data-theme')

      if (dataTheme === 'dark') {
        setIsDark(true)
      } else if (dataTheme === 'light') {
        setIsDark(false)
      } else {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', checkTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', checkTheme)
    }
  }, [])

  useEffect(() => {
    const updateIndicator = () => {
      if (!navRef.current) return

      const activeIndex = getActiveIndex()
      if (activeIndex === -1) {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }))
        return
      }

      const navItems = navRef.current.querySelectorAll('.nav-item')
      const activeItem = navItems[activeIndex] as HTMLElement

      if (activeItem) {
        const navRect = navRef.current.getBoundingClientRect()
        const itemRect = activeItem.getBoundingClientRect()

        setIndicatorStyle({
          left: itemRect.left - navRect.left,
          width: itemRect.width,
          opacity: 1,
        })
      }
    }

    updateIndicator()

    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [pathname])

  const handleLogoClick = () => {
    if (!isSpinning) {
      setIsSpinning(true)
    }
  }

  const handleSpinComplete = () => {
    setIsSpinning(false)
  }

  return (
    <>
      {/* Desktop Nav */}
      <nav className="nav nav-desktop" ref={navRef}>
        <div
          className="nav-indicator"
          style={{
            transform: `translateX(${indicatorStyle.left}px)`,
            width: `${indicatorStyle.width}px`,
            opacity: indicatorStyle.opacity,
          }}
        />
        {navLinks.map((link) => (
          link.isLogo ? (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item nav-logo ${isActive(link.href) ? 'active' : ''}`}
              onClick={(e) => { handleLogoClick(); handleNavClick(e, link.href); }}
            >
              <Suspense fallback={<div className="logo-3d-container logo-3d-placeholder" />}>
                <Logo3D
                  isDark={isDark}
                  isSpinning={isSpinning}
                  onSpinComplete={handleSpinComplete}
                />
              </Suspense>
              <span className="nav-logo-label">{link.label}</span>
            </Link>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item ${isActive(link.href) ? 'active' : ''}`}
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
            </Link>
          )
        ))}
      </nav>

      {/* Mobile Nav */}
      <nav className="nav nav-mobile">
        {navLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-mobile-item ${active ? 'active' : ''}`}
              aria-label={link.label}
              onClick={(e) => { if (link.isLogo) handleLogoClick(); handleNavClick(e, link.href); }}
            >
              {link.isLogo ? (
                <>
                  <Suspense fallback={<div className="logo-3d-container logo-3d-placeholder" style={{ width: 24, height: 24 }} />}>
                    <Logo3D
                      isDark={isDark}
                      isSpinning={isSpinning}
                      onSpinComplete={handleSpinComplete}
                    />
                  </Suspense>
                  <span className="nav-mobile-label">{link.label}</span>
                </>
              ) : (
                <>
                  <Icon size={18} />
                  <span className="nav-mobile-label">{link.label}</span>
                </>
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
