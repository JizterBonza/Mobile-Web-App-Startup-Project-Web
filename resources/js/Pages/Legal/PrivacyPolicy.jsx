import { Link } from '@inertiajs/react'
import LegalLayout, { LegalSection } from '../../Layouts/LegalLayout'

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="September 9, 2026">
      <div className="space-y-4 text-base leading-relaxed text-[#0B132B]/80">
        <p>
          This Privacy Policy explains how Agrify Connect Philippines Corporation (&quot;Agrify Connect,&quot;
          &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, shares, and protects personal information when you
          use Klasmeyt, including our website, mobile application, and related dashboards (together, the
          &quot;Services&quot;).
        </p>
        <p>
          Klasmeyt is a digital marketplace that connects gamefowl enthusiasts, breeders, and farmers with
          agrivet and gamefowl supply stores. By creating an account, placing an order, registering a store, or
          otherwise using the Services, you agree to this Policy. If you do not agree, please do not use the
          Services.
        </p>
        <p>
          We process personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173),
          its Implementing Rules and Regulations, and other applicable Philippine laws.
        </p>
      </div>

      <LegalSection title="1. Who we are">
        <p>
          Agrify Connect Philippines Corporation operates Klasmeyt and acts as a personal information controller
          for account, order, support, and platform data. Independent stores, riders, and payment providers may
          also process certain information as separate controllers or as processors, depending on the activity.
        </p>
        <p>
          For questions about this Policy or your personal information, use the Contact section on the Klasmeyt
          website.
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p>We may collect the following categories of information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information.</strong> Name, email address, mobile number, password, profile photo,
            and account type (for example, customer, store owner, vendor, rider, veterinarian, or administrator).
          </li>
          <li>
            <strong>Authentication data.</strong> Information from sign-in methods you choose, including Google
            sign-in identifiers and related profile details provided by Google.
          </li>
          <li>
            <strong>Store and business information.</strong> Shop name, address, permit or business documents,
            cover photos, catalog listings, and related vendor records.
          </li>
          <li>
            <strong>Order and delivery information.</strong> Cart contents, orders, recipient name, contact
            number, shipping address, delivery instructions, proof of delivery photos, and order status history.
          </li>
          <li>
            <strong>Location information.</strong> Approximate or precise location when you pin a delivery
            address, when a rider records proof of delivery, or when maps and address autocomplete are used.
          </li>
          <li>
            <strong>Payment information.</strong> Payment method selected, transaction status, and references
            needed to process checkout. Card, GCash, Maya, and similar payment details are handled by our
            payment partner and are not stored in full on Klasmeyt servers.
          </li>
          <li>
            <strong>Communications.</strong> In-app shop messages, support tickets, ratings, reviews, and
            messages you send through the website contact form.
          </li>
          <li>
            <strong>Technical data.</strong> Device and browser type, IP address, session identifiers, log data,
            and cookies as described in our{' '}
            <Link href="/cookie-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
              Cookie Policy
            </Link>
            .
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We use personal information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>create and manage accounts, shops, and user roles;</li>
          <li>process orders, payments, deliveries, refunds, and payouts;</li>
          <li>show nearby stores, calculate delivery zones and fees, and complete checkout;</li>
          <li>provide messaging, notifications, ratings, and customer support;</li>
          <li>verify store information, prevent fraud, and keep the platform secure;</li>
          <li>improve the Services, monitor performance, and comply with legal obligations; and</li>
          <li>communicate about orders, account activity, policy updates, and service announcements.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Legal bases">
        <p>We process personal information when one or more of the following applies:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Contract.</strong> Processing is needed to provide the Services you request, such as
            creating an account or fulfilling an order.
          </li>
          <li>
            <strong>Consent.</strong> You have given consent, for example for optional location features or
            Google sign-in.
          </li>
          <li>
            <strong>Legitimate interests.</strong> We have a legitimate interest in operating a secure
            marketplace, improving the Services, and communicating with users, provided those interests are not
            overridden by your rights.
          </li>
          <li>
            <strong>Legal obligation.</strong> We must retain or disclose information to comply with law,
            regulation, or lawful requests.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How we share information">
        <p>We may share information with:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Stores and vendors</strong> so they can accept, prepare, and fulfill your orders.
          </li>
          <li>
            <strong>Riders and delivery partners</strong> so they can pick up and deliver orders and submit
            proof of delivery.
          </li>
          <li>
            <strong>Payment providers</strong> such as PayMongo to process checkout, confirm payment status,
            and handle payouts.
          </li>
          <li>
            <strong>Service providers</strong> who help us host, store, map, authenticate, or operate the
            Services, including Google for sign-in and maps where those features are used.
          </li>
          <li>
            <strong>Authorities</strong> when required by law or to protect rights, safety, or the integrity of
            the platform.
          </li>
        </ul>
        <p>
          We do not sell your personal information. Stores, riders, and other users must use customer
          information only to complete transactions on Klasmeyt and must not use it for unrelated marketing
          without a lawful basis.
        </p>
      </LegalSection>

      <LegalSection title="6. Location and maps">
        <p>
          Location data helps you set delivery addresses, find nearby stores, define delivery zones, and confirm
          deliveries. You can decline location permission in your device or browser settings, but some delivery
          and mapping features may not work without it.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          We use cookies and similar technologies to keep you signed in, protect forms against unauthorized
          requests, and remember certain preferences. Third-party services such as Google Sign-In and Google
          Maps may also set their own cookies. Details are in our{' '}
          <Link href="/cookie-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Retention">
        <p>
          We keep personal information only as long as needed for the purposes described in this Policy, including
          order history, payouts, dispute handling, security, and legal retention requirements. When information
          is no longer needed, we delete or anonymize it where reasonably possible.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We use reasonable administrative, technical, and organizational measures to protect personal
          information, including encrypted connections, session controls, and access limited by user role. No
          method of transmission or storage is completely secure, so we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="10. Your rights">
        <p>
          Subject to applicable law, you may request to access, correct, update, or delete your personal
          information; withdraw consent where processing is based on consent; object to certain processing; or
          request a copy of information you provided to us.
        </p>
        <p>
          You can update some account details in your profile settings. For other requests, contact us through
          the website Contact section. We may need to verify your identity before fulfilling a request. You may
          also lodge a complaint with the National Privacy Commission of the Philippines.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          The Services are intended for users who are at least 18 years old. We do not knowingly collect personal
          information from children. If you believe a child has provided information to us, please contact us so
          we can take appropriate action.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this Policy">
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top of
          this page will change when we do. Continued use of the Services after an update means you accept the
          revised Policy.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <p>
          Agrify Connect Philippines Corporation operates Klasmeyt. For privacy questions or data-subject
          requests, use the Contact section on our website or write to us through the support channels available
          in your Klasmeyt account.
        </p>
        <p>
          Related documents:{' '}
          <Link href="/terms-and-conditions" className="font-medium text-[#0B132B] underline underline-offset-2">
            Terms and Conditions
          </Link>{' '}
          and{' '}
          <Link href="/cookie-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
