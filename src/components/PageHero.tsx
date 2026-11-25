import type { CSSProperties } from 'react'

type PageHeroProps = {
  title: string
  subtitle: string
  image?: string
}

export function PageHero({ title, subtitle, image }: PageHeroProps) {
  const style: CSSProperties = image
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)' }

  return (
    <section className="hero hero-page" style={style}>
      <div className="container">
        <h1 style={{ color: '#fff' }}>{title}</h1>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{subtitle}</p>
      </div>
    </section>
  )
}
