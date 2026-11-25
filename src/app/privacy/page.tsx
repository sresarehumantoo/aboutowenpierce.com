import { pageMetadata } from '@/lib/site'
import { PageHero } from '@/components/PageHero'

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: 'Privacy policy for aboutowenpierce.com: what is and is not collected when you visit.',
  path: '/privacy/',
})

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Privacy Policy"
        subtitle="Last updated: November 25, 2026"
      />

      <section className="section">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="post-content">
            <h2>Overview</h2>
            <p>
              aboutowenpierce.com (&quot;the Site&quot;) is a static website: a set of prebuilt pages with no
              server-side application, database, or user accounts behind it. I do not collect, store, or sell
              personal information about visitors.
            </p>

            <h2>Information Collected</h2>
            <h3>Hosting</h3>
            <p>
              The Site is hosted on GitHub Pages. Like any web host, GitHub receives your IP address and standard
              request details (such as the page requested, browser type, and time) when your browser loads a
              page, and GitHub Pages may log visitor IP addresses for security purposes. That data is handled by
              GitHub under the{' '}
              <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">GitHub General Privacy Statement</a>{' '}
              (see also{' '}
              <a href="https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#data-collection" target="_blank" rel="noopener noreferrer">GitHub Pages data collection</a>).
              I do not receive or have access to these logs.
            </p>
            <p>
              Cloudflare provides DNS for the domain and proxies only the www.aboutowenpierce.com address, which
              redirects to aboutowenpierce.com. If you visit the www address, that single redirect request passes
              through Cloudflare. Visits to aboutowenpierce.com itself go directly to GitHub Pages.
            </p>

            <h3>Contact Information</h3>
            <p>
              The Site has no contact forms, comment sections, or sign-ups, so nothing you type on it is sent
              anywhere. If you email me, the information you provide (such as your email address and message
              content) will only be used to respond to your inquiry. It is not shared with third parties or used
              for marketing purposes.
            </p>

            <h3>Search</h3>
            <p>
              Site search runs entirely in your browser. The first time you search, your browser downloads a
              static index of posts and projects from this Site, and matching happens locally. Your search terms
              are never sent to a server.
            </p>

            <h2>Cookies and Tracking</h2>
            <p>
              This Site sets no cookies. The only thing it stores on your device is:
            </p>
            <ul>
              <li>
                <strong>Theme preference:</strong> when you choose light, dark, or system mode with the theme toggle,
                that choice is saved in your browser&apos;s local storage under the key <code>theme</code> so the
                Site can apply it on your next visit. It never leaves your browser, and you can clear it at any time
                through your browser settings.
              </li>
            </ul>
            <p>
              This Site does not use analytics services, advertising, fingerprinting, or third-party tracking
              scripts. Fonts are bundled with the Site at build time, so loading a page does not contact Google
              Fonts or any other font service.
            </p>

            <h2>Third-Party Services</h2>
            <p>
              This Site links to external websites (GitHub, LinkedIn, Medium). No content from those sites is
              embedded here, so they are only contacted if you click a link. Once you do, their own privacy
              policies apply, and this Site is not responsible for their practices.
            </p>

            <h2>Content and Images</h2>
            <p>
              The Site&apos;s source code is MIT licensed. Posts, project write-ups, and photos are not covered by
              that license and may not be reproduced without permission.
            </p>

            <h2>Data Security</h2>
            <p>
              All connections to the Site use HTTPS. Because the Site collects no personal information, there is
              no visitor data on my side to protect or to lose.
            </p>

            <h2>Your Rights</h2>
            <p>
              I hold no personal data about Site visitors. If you have emailed me and want that correspondence
              deleted, contact me and I will delete it. For data collected by GitHub or Cloudflare, refer to their
              privacy policies.
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
