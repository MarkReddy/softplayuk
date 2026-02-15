import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

const LAST_UPDATED = '15 February 2026'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms of Service for softplayuk.co.uk, owned and operated by NextGen Reddy Holdings Pty Ltd.',
}

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 md:py-16">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          Terms of Service
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Last updated: {LAST_UPDATED}
        </p>

        <div className="prose-sm space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-0 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_li]:mb-1 [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>1. Introduction</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your use of
              softplayuk.co.uk (the &ldquo;Site&rdquo;).
            </p>
            <p>The Site is owned and operated by:</p>
            <p>
              <strong>NextGen Reddy Holdings Pty Ltd</strong>
              <br />
              ABN 40 601 920 665
              <br />
              Australia
            </p>
            <p>
              By accessing or using the Site, you agree to these Terms. If you
              do not agree, you must not use the Site.
            </p>
          </section>

          <section>
            <h2>2. Nature of the Service</h2>
            <p>
              Softplay UK is an independent directory and information platform
              designed to help users discover soft play venues in the United
              Kingdom.
            </p>
            <p>
              We do not own, operate, manage, or control any venues listed on
              the Site. We act solely as an information intermediary.
            </p>
          </section>

          <section>
            <h2>3. Accuracy of Information</h2>
            <p>
              We make reasonable efforts to ensure information is accurate and up
              to date. However, we do not guarantee the accuracy, completeness,
              or reliability of any information displayed, including:
            </p>
            <ul>
              <li>Opening hours</li>
              <li>Pricing</li>
              <li>Facilities and amenities</li>
              <li>Cleanliness indicators</li>
              <li>Ratings and reviews</li>
              <li>Photographs</li>
            </ul>
            <p>
              Information may originate from third-party sources (including
              Google Places API) and may change without notice. Users should
              contact venues directly to confirm details before visiting.
            </p>
          </section>

          <section>
            <h2>4. No Endorsement</h2>
            <p>
              Listings, ratings, and reviews do not constitute endorsements.
              Display of a venue does not imply recommendation or approval.
            </p>
          </section>

          <section>
            <h2>5. External Links</h2>
            <p>
              The Site may contain links to third-party websites. We have no
              control over and accept no responsibility for third-party content,
              policies, or practices.
            </p>
          </section>

          <section>
            <h2>6. Intellectual Property</h2>
            <p>
              All original content on the Site, including design, layout, text,
              and software, is owned by NextGen Reddy Holdings Pty Ltd or its
              licensors.
            </p>
            <p>
              Third-party content (including venue images and reviews sourced via
              Google Places) remains the property of its respective owners and is
              displayed under applicable licence terms.
            </p>
            <p>
              You may not reproduce or exploit Site content for commercial
              purposes without prior written permission.
            </p>
          </section>

          <section>
            <h2>7. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law:</p>
            <ul>
              <li>
                The Site is provided &ldquo;as is&rdquo; and &ldquo;as
                available.&rdquo;
              </li>
              <li>
                We do not guarantee uninterrupted or error-free operation.
              </li>
              <li>
                We are not liable for loss or damage arising from reliance on
                information displayed on the Site.
              </li>
              <li>
                We are not liable for any acts, omissions, or conduct of venues
                listed.
              </li>
              <li>
                Nothing in these Terms excludes liability that cannot be excluded
                by law.
              </li>
            </ul>
          </section>

          <section>
            <h2>8. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Site for unlawful purposes</li>
              <li>Attempt to interfere with Site functionality</li>
              <li>
                Use automated systems to scrape or copy content without
                permission
              </li>
            </ul>
          </section>

          <section>
            <h2>9. Modifications</h2>
            <p>
              We may modify, suspend, or discontinue the Site at any time without
              liability.
            </p>
          </section>

          <section>
            <h2>10. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Site constitutes acceptance of any revised Terms.
            </p>
          </section>

          <section>
            <h2>11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales in
              relation to users accessing the Site from the United Kingdom.
            </p>
          </section>

          <section>
            <h2>12. Contact</h2>
            <p>
              <a
                href="mailto:legal@softplayuk.co.uk"
                className="text-primary underline hover:text-primary/80"
              >
                legal@softplayuk.co.uk
              </a>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
