import { GitHubIcon, LinkedInIcon, MediumIcon, EmailIcon } from '@/components/Icons'
import { pageMetadata } from '@/lib/site'
import { PageHero } from '@/components/PageHero'

export const metadata = pageMetadata({
  title: 'Contact',
  description: 'Get in touch with Owen Pierce - reach out via email or connect on social media.',
  path: '/contact/',
})

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Get in Touch"
        subtitle="Have a question or want to work together? I'd love to hear from you."
        image="/images/contact-hero.jpg"
      />

      <section className="section">
        <div className="container" style={{ maxWidth: '700px' }}>
          <div className="contact-grid">
            <a
              href="mailto:owenpierceee@gmail.com"
              className="contact-card"
            >
              <div className="contact-icon">
                <EmailIcon size={32} />
              </div>
              <h2>Email</h2>
              <p>owenpierceee@gmail.com</p>
              <span className="contact-cta">Send a message</span>
            </a>

            <a
              href="https://github.com/SREsAreHumanToo"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-icon">
                <GitHubIcon size={32} />
              </div>
              <h2>GitHub</h2>
              <p>@SREsAreHumanToo</p>
              <span className="contact-cta">View projects</span>
            </a>

            <a
              href="https://www.linkedin.com/in/prodguardian/"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-icon">
                <LinkedInIcon size={32} />
              </div>
              <h2>LinkedIn</h2>
              <p>@ProdGuardian</p>
              <span className="contact-cta">Connect with me</span>
            </a>

            <a
              href="https://medium.com/@SREsAreHumanToo"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-card"
            >
              <div className="contact-icon">
                <MediumIcon size={32} />
              </div>
              <h2>Medium</h2>
              <p>@SREsAreHumanToo</p>
              <span className="contact-cta">Read articles</span>
            </a>
          </div>

          <div className="contact-info" style={{ marginTop: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.1rem', lineHeight: 1.7 }}>
              Based in Detroit, MI. Currently working as a Security Engineer at Ally Financial.
              Open to discussing opportunities, collaborations, or just chatting about tech.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
