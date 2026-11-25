'use client'

import Link from 'next/link'
import { TypeWriter } from './TypeWriter'

export function HeroSection() {
  return (
    <section className="hero" style={{
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(/images/hero-coding.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="container">
        <h1 style={{ color: '#fff', minHeight: '1.2em' }}>
          <TypeWriter text="Owen Pierce" delay={120} />
        </h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
          Security Engineer at Ally Financial. Building detection and response automation and least-privilege access for AI agents.
        </p>
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/projects" className="btn btn-primary">
            View Projects
          </Link>
          <Link href="/about" className="btn btn-hero-outline">
            About Me
          </Link>
        </div>
      </div>
    </section>
  )
}
