import { Link } from '@inertiajs/react'
import LegalLayout, { LegalSection } from '../../Layouts/LegalLayout'

function CookieRow({ name, purpose, duration, type }) {
  return (
    <div className="border-b border-black/10 py-4 last:border-b-0">
      <p className="font-semibold text-[#0B132B]">{name}</p>
      <p className="mt-1 text-sm text-[#0B132B]/70">{purpose}</p>
      <p className="mt-2 text-xs uppercase tracking-wide text-[#0B132B]/50">
        {type}
        {duration ? ` · ${duration}` : ''}
      </p>
    </div>
  )
}

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="September 9, 2026">
      <div className="space-y-4 text-base leading-relaxed text-[#0B132B]/80">
        <p>
          This Cookie Policy explains how Agrify Connect Philippines Corporation uses cookies and similar
          technologies on Klasmeyt. It should be read with our{' '}
          <Link href="/privacy-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <LegalSection title="1. What cookies are">
        <p>
          Cookies are small text files stored on your device when you visit a website. Similar technologies
          include local storage, session storage, and pixels. They help a site remember your session, keep
          forms secure, and load third-party features such as sign-in or maps.
        </p>
      </LegalSection>

      <LegalSection title="2. How Klasmeyt uses cookies">
        <p>
          We use cookies that are needed to operate the Services. We do not currently use advertising or
          cross-site tracking cookies on the Klasmeyt website. If that changes, we will update this Policy.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies we set">
        <div className="rounded-[10px] border border-black/10 bg-[#F8F9FB] px-4 sm:px-5">
          <CookieRow
            name="Session cookie"
            type="Strictly necessary"
            duration="Until you sign out or the session expires"
            purpose="Keeps you signed in while you use Klasmeyt and stores server-side session data."
          />
          <CookieRow
            name="XSRF-TOKEN"
            type="Strictly necessary"
            duration="Session"
            purpose="Protects forms and requests against cross-site request forgery."
          />
          <CookieRow
            name="Remember-me cookie"
            type="Functional"
            duration="Until you sign out or the remembered period ends"
            purpose="Keeps you signed in across visits if you choose a persistent login option."
          />
        </div>
        <p>
          Cookie names may vary slightly depending on configuration. Strictly necessary cookies cannot be
          disabled in the app without breaking sign-in, checkout, and dashboard features.
        </p>
      </LegalSection>

      <LegalSection title="4. Third-party cookies">
        <p>Some features are provided by other companies, which may set their own cookies:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Google Sign-In.</strong> If you sign in with Google, Google may set cookies to complete
            authentication. See Google&apos;s privacy and cookie documentation for details.
          </li>
          <li>
            <strong>Google Maps.</strong> Address pinning, autocomplete, and zone maps may load Google Maps,
            which can set cookies or local storage used by Google.
          </li>
          <li>
            <strong>Payment checkout.</strong> When you pay through PayMongo or similar providers, their
            checkout pages may set cookies needed to complete the payment.
          </li>
        </ul>
        <p>
          We do not control third-party cookies. Their use is governed by the third party&apos;s own policies.
        </p>
      </LegalSection>

      <LegalSection title="5. Managing cookies">
        <p>
          You can delete or block cookies in your browser settings. Most browsers let you refuse cookies, delete
          existing cookies, or alert you when cookies are set. If you block strictly necessary cookies, you may
          not be able to sign in, place orders, or use dashboards.
        </p>
        <p>
          You can also sign out of your Klasmeyt account and clear site data for this domain. Device location
          permission is managed in your browser or mobile operating system, not through cookies.
        </p>
      </LegalSection>

      <LegalSection title="6. Updates">
        <p>
          We may update this Cookie Policy when our practices change. The &quot;Last updated&quot; date at the
          top of this page will be revised when we do.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          Questions about cookies may be sent through the Contact section on the Klasmeyt website. Related
          documents:{' '}
          <Link href="/privacy-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/terms-and-conditions" className="font-medium text-[#0B132B] underline underline-offset-2">
            Terms and Conditions
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
