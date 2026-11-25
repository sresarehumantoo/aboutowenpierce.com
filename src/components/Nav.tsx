'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useCallback } from 'react'
import { PenIcon, FolderIcon, UserIcon, EmailIcon, HomeIcon } from './Icons'
import { Logo3D } from './Logo3D'

export const navLinks = [
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
  const indicatorRef = useRef<HTMLDivElement>(null)
  const [isSpinning, setIsSpinning] = useState(false)

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

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    const isAtTop = window.scrollY < 10

    if (isActive(href) && !isAtTop) {
      // Same page, not at top — scroll to top
      e.preventDefault()
      // No explicit behavior: the html scroll-behavior rule applies, which honors reduced motion.
      window.scrollTo({ top: 0 })
      return
    }

    if (isDetailPage(href) && isAtTop) {
      // Detail page, already at top — go to listing
      e.preventDefault()
      router.push(href)
      return
    }
  }

  const activeIndex = navLinks.findIndex((link) => isActive(link.href))

  useEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator) return

    const updateIndicator = () => {
      const activeItem = nav.querySelectorAll<HTMLElement>('.nav-item')[activeIndex]
      if (!activeItem) {
        indicator.style.opacity = '0'
        return
      }
      indicator.style.transform = `translateX(${activeItem.offsetLeft}px)`
      indicator.style.width = `${activeItem.offsetWidth}px`
      indicator.style.opacity = '1'
    }

    updateIndicator()
    // Enable the slide only after the first placement has been styled (the read forces
    // that), so a full page load doesn't animate the indicator in from the left edge.
    indicator.getBoundingClientRect()
    indicator.classList.add('nav-indicator-ready')

    // Item widths change when the web font swaps in, not just on window resize.
    const observer = new ResizeObserver(updateIndicator)
    nav.querySelectorAll('.nav-item').forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [activeIndex])

  const handleLogoClick = () => {
    if (!isSpinning) {
      setIsSpinning(true)
    }
  }

  const handleSpinComplete = useCallback(() => {
    setIsSpinning(false)
  }, [])

  return (
    <>
      {/* Desktop Nav */}
      <nav className="nav nav-desktop" ref={navRef} aria-label="Main">
        <div className="nav-indicator" ref={indicatorRef} aria-hidden="true" />
        {navLinks.map((link) => (
          link.isLogo ? (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item nav-logo ${isActive(link.href) ? 'active' : ''}`}
              aria-current={isActive(link.href) ? 'page' : undefined}
              onClick={(e) => { handleLogoClick(); handleNavClick(e, link.href); }}
            >
              <Logo3D isSpinning={isSpinning} onSpinComplete={handleSpinComplete} />
              <span className="nav-logo-label">{link.label}</span>
            </Link>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item ${isActive(link.href) ? 'active' : ''}`}
              aria-current={isActive(link.href) ? 'page' : undefined}
              onClick={(e) => handleNavClick(e, link.href)}
            >
              {link.label}
            </Link>
          )
        ))}
      </nav>

      {/* Mobile Nav */}
      <nav className="nav nav-mobile" aria-label="Main">
        {navLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-mobile-item ${active ? 'active' : ''}`}
              aria-label={link.label}
              aria-current={active ? 'page' : undefined}
              onClick={(e) => { if (link.isLogo) handleLogoClick(); handleNavClick(e, link.href); }}
            >
              {link.isLogo ? (
                <>
                  <Logo3D isSpinning={isSpinning} onSpinComplete={handleSpinComplete} />
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
