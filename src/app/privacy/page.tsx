import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for aboutowenpierce.com - how we handle your data.',
}

export default function PrivacyPage() {
  return (
    <>
      <section className="hero hero-page" style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #7c3aed 100%)',
      }}>
        <div className="container">
          <h1 style={{ color: '#fff' }}>Privacy Policy</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Last updated: March 23, 2026</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="post-content">
            <h2>Overview</h2>
            <p>
              This privacy policy describes how aboutowenpierce.com (&quot;the Site&quot;) collects, uses, and protects
              information when you visit. Your privacy is important, and this Site is designed to collect minimal data.
            </p>

            <h2>Information Collected</h2>
            <h3>Server Logs</h3>
            <p>
              Like most websites, standard server logs may record technical information such as your IP address,
              browser type, referring pages, and timestamps. This data is used solely for security monitoring,
              troubleshooting, and site performance analysis. Logs are retained for a limited period and are not
              shared with third parties.
            </p>

            <h3>Contact Information</h3>
            <p>
              If you contact me via email or other means provided on this Site, the information you provide
              (such as your email address and message content) will only be used to respond to your inquiry.
              This information is not shared with third parties or used for marketing purposes.
            </p>

            <h2>Cookies and Tracking</h2>
            <p>
              This Site uses minimal cookies strictly for essential functionality:
            </p>
            <ul>
              <li><strong>Theme preference:</strong> A local storage item may be used to remember your light/dark mode preference.</li>
            </ul>
            <p>
              This Site does not use analytics services, advertising cookies, or third-party tracking scripts.
            </p>

            <h2>Third-Party Services</h2>
            <p>
              This Site may contain links to external websites (GitHub, LinkedIn, Medium, etc.). These sites have
              their own privacy policies, and this Site is not responsible for their practices. Please review their
              policies before providing any personal information.
            </p>

            <h2>Image and Content Protection</h2>
            <p>
              Images on this Site are protected to comply with licensing requirements. Unauthorized reproduction,
              distribution, or use of images without permission is prohibited.
            </p>

            <h2>Data Security</h2>
            <p>
              Reasonable measures are taken to protect information from unauthorized access, including HTTPS
              encryption for all connections. However, no internet transmission is completely secure.
            </p>

            <h2>Your Rights</h2>
            <p>
              You may request information about any personal data held about you or request its deletion by
              contacting me directly. Since this Site collects minimal data, there is typically little to no
              personal information stored.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              This privacy policy may be updated periodically. Changes will be posted on this page with an
              updated revision date.
            </p>

            <h2>Contact</h2>
            <p>
              For privacy-related questions or concerns, please contact me at{' '}
              <a href="mailto:owenpierceee@gmail.com">owenpierceee@gmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
