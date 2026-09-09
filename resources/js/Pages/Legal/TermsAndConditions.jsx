import { Link } from '@inertiajs/react'
import LegalLayout, { LegalSection } from '../../Layouts/LegalLayout'

export default function TermsAndConditions() {
  return (
    <LegalLayout title="Terms and Conditions" lastUpdated="September 9, 2026">
      <div className="space-y-4 text-base leading-relaxed text-[#0B132B]/80">
        <p>
          These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of Klasmeyt, including the
          website, mobile application, and related dashboards (the &quot;Services&quot;). The Services are operated
          by Agrify Connect Philippines Corporation (&quot;Agrify Connect,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;).
        </p>
        <p>
          By creating an account, browsing, placing an order, listing products, delivering orders, or otherwise
          using the Services, you agree to these Terms and to our{' '}
          <Link href="/privacy-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Privacy Policy
          </Link>{' '}
          and{' '}
          <Link href="/cookie-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Cookie Policy
          </Link>
          . If you do not agree, do not use the Services.
        </p>
      </div>

      <LegalSection title="1. The Klasmeyt platform">
        <p>
          Klasmeyt is a digital marketplace that connects buyers with independent agrivet and gamefowl supply
          stores. Unless we expressly sell an item as the merchant of record, stores are responsible for their
          products, pricing, inventory, permits, product descriptions, order preparation, and after-sales
          handling.
        </p>
        <p>
          We provide software, payments facilitation, order routing, delivery coordination, and related tools. We
          are not a party to every contract of sale between a buyer and a store, except where these Terms or an
          order confirmation say otherwise.
        </p>
      </LegalSection>

      <LegalSection title="2. Eligibility and accounts">
        <p>You must be at least 18 years old and able to form a binding contract under Philippine law.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide accurate, complete, and current information and keep it updated.</li>
          <li>Keep your login credentials confidential and notify us promptly of unauthorized use.</li>
          <li>
            You are responsible for activity that occurs under your account, including actions by staff you
            authorize (for example, vendors assigned to a shop).
          </li>
          <li>
            We may refuse, suspend, or close an account if we reasonably believe these Terms, our policies, or
            the law have been violated.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Buyer terms">
        <p>
          Product listings, availability, and prices are set by stores and may change. An order is an offer to
          buy. A store may accept, decline, or be unable to fulfill an order due to stock, location, payment, or
          other reasons.
        </p>
        <p>
          You agree to provide a valid delivery address and contact details, be available for delivery or
          pickup as applicable, and pay all amounts due, including product price, delivery fees, handling fees,
          and any taxes shown at checkout.
        </p>
        <p>
          Images and descriptions are for general information. Always follow product labels, veterinary advice,
          and applicable regulations when using agricultural or animal-care supplies.
        </p>
      </LegalSection>

      <LegalSection title="4. Store, vendor, and seller terms">
        <p>
          If you operate a store or vendor account, you represent that you have the legal right to sell the
          products you list and that you hold any required business permits, licenses, and product
          authorizations.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>List products accurately, including price, stock, and important product information.</li>
          <li>Honor accepted orders and prepare them within the timeframes shown in the dashboard.</li>
          <li>Use customer information only to fulfill Klasmeyt orders and provide related support.</li>
          <li>
            Comply with payout, commission, delivery-fee, and handling-fee arrangements shown in your account
            or agreed separately with Agrify Connect.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Payments">
        <p>
          Payments may be processed through third-party providers such as PayMongo and may include methods like
          cards, GCash, Maya, or cash on delivery where enabled for your area. You authorize us and our payment
          partners to charge, collect, or disburse amounts related to your transactions.
        </p>
        <p>
          Failed, cancelled, or reversed payments may result in order cancellation. Stores receive payouts
          according to the payout schedule and rules in the Services, subject to holds for disputes, refunds, or
          suspected fraud.
        </p>
      </LegalSection>

      <LegalSection title="6. Delivery">
        <p>
          Delivery availability, fees, and coverage depend on store location, delivery method, and service zones.
          Estimated times are not guarantees. Risk of loss generally passes to the buyer upon delivery to the
          address provided, or upon pickup if that option is used, unless applicable law says otherwise.
        </p>
        <p>
          Riders may collect proof of delivery, including photos and location data, to confirm completion. You
          agree that such records may be used to resolve delivery disputes.
        </p>
      </LegalSection>

      <LegalSection title="7. Cancellations, refunds, and returns">
        <p>
          Cancellation and refund handling depends on order status, the payment method used, and the store&apos;s
          policies, subject to Philippine consumer protection laws. Requests may be made through in-app support
          or the store messaging tools.
        </p>
        <p>
          Perishable, opened, or customized goods may not be returnable except as required by law. If a refund is
          approved, it will be issued through the original payment channel or another method we reasonably
          specify, and processing times depend on the payment provider.
        </p>
      </LegalSection>

      <LegalSection title="8. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>use the Services for unlawful, fraudulent, or harmful activity;</li>
          <li>list prohibited, counterfeit, expired, misbranded, or illegally sourced products;</li>
          <li>interfere with the platform, scrape data without permission, or attempt unauthorized access;</li>
          <li>harass other users, post false reviews, or misuse messaging and support channels; or</li>
          <li>use Klasmeyt branding in a way that suggests endorsement without our written permission.</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Content and intellectual property">
        <p>
          You retain rights to content you submit (such as shop photos, listings, messages, and reviews). You
          grant Agrify Connect a non-exclusive, worldwide, royalty-free license to host, display, and use that
          content as needed to operate and promote the Services.
        </p>
        <p>
          The Klasmeyt name, logos, software, and site design are owned by Agrify Connect or its licensors. You
          may not copy, modify, or reverse engineer the Services except as allowed by law.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the fullest
          extent permitted by law, we disclaim warranties of merchantability, fitness for a particular purpose,
          and non-infringement. We do not warrant that listings are error-free, that delivery will be
          uninterrupted, or that products sold by stores will meet your specific needs.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of liability">
        <p>
          To the fullest extent permitted by law, Agrify Connect and its officers, employees, and partners will
          not be liable for indirect, incidental, special, consequential, or punitive damages, or for lost
          profits, data, or goodwill, arising from your use of the Services.
        </p>
        <p>
          Our total liability for claims relating to the Services will not exceed the greater of (a) the amounts
          you paid to us in platform fees during the three months before the claim or (b) one thousand Philippine
          pesos (PHP 1,000), except where liability cannot be limited under applicable law, including liability
          for fraud or gross negligence.
        </p>
      </LegalSection>

      <LegalSection title="12. Indemnity">
        <p>
          You agree to indemnify and hold harmless Agrify Connect from claims, damages, and expenses (including
          reasonable legal fees) arising from your content, your products, your breach of these Terms, or your
          violation of law or third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="13. Suspension and termination">
        <p>
          You may stop using the Services at any time. We may suspend or terminate access if you breach these
          Terms, if required by law, or if we discontinue the Services. Provisions that by their nature should
          survive (including payment obligations, disclaimers, and liability limits) will survive termination.
        </p>
      </LegalSection>

      <LegalSection title="14. Governing law">
        <p>
          These Terms are governed by the laws of the Republic of the Philippines. Courts of competent
          jurisdiction in the Philippines shall have exclusive venue over disputes, without prejudice to any
          mandatory consumer-protection venue rules that apply to you.
        </p>
      </LegalSection>

      <LegalSection title="15. Changes">
        <p>
          We may update these Terms from time to time. The &quot;Last updated&quot; date will change when we do.
          If you continue using the Services after the update, you accept the revised Terms. If you do not agree,
          you must stop using the Services.
        </p>
      </LegalSection>

      <LegalSection title="16. Contact">
        <p>
          Questions about these Terms may be sent through the Contact section on the Klasmeyt website or through
          in-app support.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
