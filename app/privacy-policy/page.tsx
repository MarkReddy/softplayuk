import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

const LAST_UPDATED = '15 February 2026'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Privacy Policy for softplayuk.co.uk, owned and operated by NextGen Reddy Holdings Pty Ltd. Learn how we process your data.',
}

export default function PrivacyPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Privacy Policy
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose-sm space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mb-1 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>1. Who We Are</h2>
            <p>
              softplayuk.co.uk (the &ldquo;Site&rdquo;) is owned and operated
              by:
            </p>
            <p>
              <strong>NextGen Reddy Holdings Pty Ltd</strong>
              <br />
              ABN 40 601 920 665
              <br />
              Australia
            </p>
            <p>
              For the purposes of UK data protection law, we act as the data
              controller in relation to personal data processed through this
              Site.
            </p>
            <p>
              Contact:{' '}
              <a
                href="mailto:privacy@softplayuk.co.uk"
                className="text-primary underline hover:text-primary/80"
              >
                privacy@softplayuk.co.uk
              </a>
            </p>
          </section>

          <section>
            <h2>2. Overview</h2>
            <p>
              Softplay UK is an information directory website. We do not require
              users to create accounts or submit personal profiles in order to
              access the Site.
            </p>
            <p>
              We process only limited technical information necessary to operate
              the Site securely and effectively.
            </p>
          </section>

          <section>
            <h2>3. Information We Process</h2>

            <h3>Technical Data</h3>
            <p>
              When you visit the Site, certain technical information is
              automatically processed, including:
            </p>
            <ul>
              <li>IP address</li>
              <li>Browser and device type</li>
              <li>Pages visited</li>
              <li>Date and time of access</li>
            </ul>
            <p>
              This information is used for security, performance monitoring, and
              basic analytics purposes.
            </p>

            <h3>Postcode Searches</h3>
            <p>
              If you enter a postcode into the search function, that postcode is
              sent to the postcodes.io API solely to return relevant location
              results. We do not permanently store postcodes or associate them
              with identifiable individuals.
            </p>

            <h3>Cookies</h3>
            <p>We use:</p>
            <ul>
              <li>Essential cookies necessary for site functionality</li>
              <li>Optional analytics cookies (only if consent is provided)</li>
            </ul>
            <p>We do not use marketing or advertising cookies.</p>
            <p>
              You can change your cookie preferences at any time by clicking
              &ldquo;Cookie Settings&rdquo; in the site footer.
            </p>
          </section>

          <section>
            <h2>4. Legal Basis</h2>
            <p>We process data under:</p>
            <ul>
              <li>
                <strong>Legitimate interests</strong> &mdash; to operate and
                secure the Site
              </li>
              <li>
                <strong>Consent</strong> &mdash; where required for analytics
                cookies
              </li>
            </ul>
          </section>

          <section>
            <h2>5. Data Sharing</h2>
            <p>
              We use trusted third-party service providers, including:
            </p>
            <ul>
              <li>
                <strong>Vercel Inc.</strong> &mdash; hosting
              </li>
              <li>
                <strong>Google LLC</strong> &mdash; venue data via Google Places
                API
              </li>
              <li>
                <strong>postcodes.io</strong> &mdash; postcode lookup
              </li>
            </ul>
            <p>We do not sell personal data.</p>
          </section>

          <section>
            <h2>6. International Transfers</h2>
            <p>
              As an Australian company serving UK users, data may be processed
              outside the UK. Appropriate safeguards are relied upon through our
              service providers.
            </p>
          </section>

          <section>
            <h2>7. Retention</h2>
            <ul>
              <li>Server logs retained for up to 90 days</li>
              <li>Aggregated analytics retained in anonymised form</li>
            </ul>
            <p>
              We do not maintain user accounts or long-term personal data
              records.
            </p>
          </section>

          <section>
            <h2>8. Your Rights</h2>
            <p>Under UK GDPR, you may:</p>
            <ul>
              <li>Request access to your personal data</li>
              <li>Request correction or deletion</li>
              <li>Object to certain processing</li>
              <li>
                Lodge a complaint with the{' '}
                <a
                  href="https://ico.org.uk/make-a-complaint/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80"
                >
                  UK ICO
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Updates</h2>
            <p>
              This policy may be updated from time to time. The latest version
              will always appear on this page.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
