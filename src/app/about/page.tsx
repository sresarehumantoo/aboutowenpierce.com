import Image from 'next/image'
import { getExperience } from '@/lib/content'
import { formatDate as formatFullDate } from '@/lib/format'
import { PersonJsonLd } from '@/components/JsonLd'
import { pageMetadata } from '@/lib/site'
import { PageHero } from '@/components/PageHero'

export const metadata = pageMetadata({
  title: 'About',
  description: 'Learn more about Owen Pierce - background, experience, and skills.',
  path: '/about/',
})

function formatDate(date: string) {
  return formatFullDate(date, 'short', false)
}

export default function AboutPage() {
  const experiences = getExperience()

  const workExperiences = experiences.filter((e) => e.type === 'work')
  const educationExperiences = experiences.filter((e) => e.type === 'education')
  const certifications = experiences.filter((e) => e.type === 'certification')
  const featuredCerts = certifications.filter((c) => c.description)
  const otherCerts = certifications.filter((c) => !c.description)

  return (
    <>
      <PersonJsonLd />
      <PageHero
        title="About Me"
        subtitle="Security Engineer, Infrastructure Enthusiast, Home Lab Champion"
        image="/images/about-hero.jpg"
      />

      <section className="section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="about-intro">
            <div className="about-image-wrapper">
              <Image
                src="/images/profile.jpg"
                alt="Owen Pierce - Security Engineer"
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                className="about-image"
                priority
              />
            </div>
            <div className="about-bio">
              <p>
                Hello, my name is Owen. I build security systems meant to be operated, increasingly by AI
                agents as well as people. I&apos;m a security engineer at Ally Financial in Detroit, MI, on a
                combined threat hunting, detection engineering, and automation engineering team, working on
                detection and response automation in Python and Go.
              </p>
              <p>
                I got here in four roles over 19 months: SRE running production AWS workloads with Terraform
                and CI/CD, SOC analyst and the team&apos;s AWS subject matter expert, then the SOC&apos;s
                Operational Readiness pillar, where I led the team&apos;s AI adoption with MCP-based tooling.
              </p>
              <p>
                Outside of work I run a zero trust home lab as code (Proxmox, Terraform, Ansible, GitLab CI),
                build open-source offensive and defensive tooling, and work through Hack The Box labs to keep
                my skills sharp.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Skills & Technologies</h2>
            <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>Detection & Response</h3>
                <div className="tags">
                  <span className="tag">Detection Engineering</span>
                  <span className="tag">Threat Hunting</span>
                  <span className="tag">Threat Detection</span>
                  <span className="tag">Incident Response</span>
                  <span className="tag">SIEM</span>
                  <span className="tag">Malware Analysis</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>Security</h3>
                <div className="tags">
                  <span className="tag">Cloud Security</span>
                  <span className="tag">Zero Trust Architecture</span>
                  <span className="tag">Penetration Testing</span>
                  <span className="tag">Active Directory</span>
                  <span className="tag">Secrets Management</span>
                  <span className="tag">HashiCorp Vault</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>Languages</h3>
                <div className="tags">
                  <span className="tag">Python</span>
                  <span className="tag">Go</span>
                  <span className="tag">TypeScript</span>
                  <span className="tag">Bash</span>
                  <span className="tag">PowerShell</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>Infrastructure & Cloud</h3>
                <div className="tags">
                  <span className="tag">AWS</span>
                  <span className="tag">Terraform</span>
                  <span className="tag">Ansible</span>
                  <span className="tag">Docker</span>
                  <span className="tag">Kubernetes</span>
                  <span className="tag">Proxmox</span>
                  <span className="tag">Linux</span>
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>AI & Automation</h3>
                <div className="tags">
                  <span className="tag">Security Automation</span>
                  <span className="tag">AI Agents</span>
                  <span className="tag">LLMs</span>
                  <span className="tag">MCP</span>
                  <span className="tag">GitLab CI/CD</span>
                  <span className="tag">ServiceNow</span>
                </div>
              </div>
            </div>
          </div>

          {certifications.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Certifications</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {featuredCerts.map((cert) => (
                  <div key={cert.title} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{cert.title}</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>{cert.company}</p>
                      </div>
                      {cert.highlights.map((badge) => (
                        <span key={badge} className="tag" style={{ background: 'var(--color-primary)', color: 'var(--color-bg)' }}>{badge}</span>
                      ))}
                    </div>
                    <p style={{ marginTop: '0.75rem', fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
                      {cert.description}
                    </p>
                  </div>
                ))}

                {otherCerts.length > 0 && (
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    {otherCerts.map((cert) => (
                      <div key={cert.title} className="card" style={{ padding: '1.25rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{cert.title}</h3>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{cert.company}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {educationExperiences.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Education</h2>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {educationExperiences.map((edu) => (
                  <div key={edu.title} className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{edu.title}</h3>
                        <p style={{ color: 'var(--color-text-secondary)' }}>{edu.company}</p>
                      </div>
                      <span className="tag">{edu.current || !edu.endDate ? 'Present' : edu.endDate.slice(0, 4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {workExperiences.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>
                Work Experience
              </h2>
              <div className="timeline">
                {workExperiences.map((exp) => (
                  <div key={`${exp.company}-${exp.startDate}`} className={`timeline-item${exp.current ? ' timeline-item-current' : ''}`}>
                    <div className="timeline-date">
                      {formatDate(exp.startDate)} &ndash;{' '}
                      {exp.current ? 'Present' : exp.endDate ? formatDate(exp.endDate) : 'Present'}
                    </div>
                    <h3 className="timeline-title">{exp.title}</h3>
                    <div className="timeline-company">
                      {exp.company}
                      {exp.location && ` • ${exp.location}`}
                    </div>
                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem', color: 'var(--color-text-secondary)' }}>
                        {exp.highlights.map((highlight, index) => (
                          <li key={index}>{highlight}</li>
                        ))}
                      </ul>
                    )}
                    {exp.skills && exp.skills.length > 0 && (
                      <div className="tags" style={{ marginTop: '0.75rem' }}>
                        {exp.skills.map((skill, index) => (
                          <span key={index} className="tag">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {experiences.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '2rem 0' }}>
              Experience details coming soon!
            </p>
          )}
        </div>
      </section>
    </>
  )
}
