import { Link } from '@inertiajs/react'
import { SUPPORT_EMAIL } from '../../Components/Landing/companyContact'
import LegalLayout, { LegalContactDetails, LegalSection } from '../../Layouts/LegalLayout'

export default function RefundAndCancellationPolicy() {
  return (
    <LegalLayout title="Refund and Cancellation Policy" lastUpdated="September 14, 2026">
      <div className="space-y-4 text-base leading-relaxed text-[#0B132B]/80">
        <p>
          This Refund and Cancellation Policy explains how cancellations, refunds, and returns are handled on
          Klasmeyt. It forms part of our{' '}
          <Link href="/terms-and-conditions" className="font-medium text-[#0B132B] underline underline-offset-2">
            Terms and Conditions
          </Link>{' '}
          and applies to orders placed through the Klasmeyt website and mobile application.
        </p>
        <p>
          Klasmeyt is a marketplace operated by Agrify Connect Philippines Corporation. Independent stores sell
          most products. Refund and cancellation outcomes can depend on order status, the payment method used,
          and whether the store has already accepted or prepared the order. This Policy is subject to the
          Consumer Act of the Philippines (Republic Act No. 7394) and other applicable laws.
        </p>
      </div>

      <LegalSection title="1. How to request a cancellation or refund">
        <p>You may request a cancellation or refund by:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>using the cancel option in the Klasmeyt app while the order is still eligible;</li>
          <li>messaging the store through in-app shop chat; or</li>
          <li>
            emailing{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-[#0B132B] underline underline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
            , using in-app support, or the Contact section on our website.
          </li>
        </ul>
        <p>
          Please include your order code, the store involved, and the reason for your request. For multi-store
          orders, tell us which shop or items the request covers.
        </p>
      </LegalSection>

      <LegalSection title="2. Buyer cancellations">
        <p>
          You may cancel an order, or a shop&apos;s portion of a multi-store order, while it is still{' '}
          <strong>Pending</strong> and the store has not started preparing it. Once a store moves an order to
          Preparing, Ready for Delivery, In-Transit, or Delivered, it generally cannot be cancelled except as
          described in this Policy or as required by law.
        </p>
        <p>
          Cancelling a pending prepaid order does not by itself complete a refund. If payment was already
          collected, we or the store will process a refund according to Sections 6 and 7.
        </p>
      </LegalSection>

      <LegalSection title="3. Store cancellations and declined orders">
        <p>
          A store may decline or cancel a pending order if an item is out of stock, the delivery location cannot
          be served, payment cannot be confirmed, or another legitimate fulfillment issue arises. The store
          should provide a reason, and you will be notified in the app.
        </p>
        <p>
          If you already paid for a declined or store-cancelled order, you are entitled to a refund of the
          amounts paid for the cancelled items, including related delivery or handling charges that were not
          earned because the order was not fulfilled.
        </p>
      </LegalSection>

      <LegalSection title="4. Unpaid and failed payments">
        <p>
          An order may be cancelled if payment is not completed, expires, fails, or is reversed by the payment
          provider. Leaving a PayMongo checkout page or cancelling a wallet payment does not always cancel the
          order immediately; we first confirm the payment status with our payment partner.
        </p>
        <p>
          If no successful payment was collected, there is nothing to refund. For cash on delivery (COD) orders
          cancelled before delivery, no product payment is collected.
        </p>
      </LegalSection>

      <LegalSection title="5. After an order is being prepared or delivered">
        <p>After a store accepts and starts preparing an order, cancellation is limited. We may still help if:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>you received the wrong item, a missing item, or a damaged or defective product;</li>
          <li>the product is expired, unsafe, or materially different from the listing;</li>
          <li>the order was not delivered within a reasonable time and the delay is not caused by you; or</li>
          <li>proof of delivery does not reasonably show that the order reached the address you provided.</li>
        </ul>
        <p>
          Change of mind after preparation or dispatch is generally not a ground for cancellation or refund,
          except where consumer-protection law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="6. Refund eligibility">
        <p>Refunds are typically approved when:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>you cancel while the order is still pending and a prepaid payment was collected;</li>
          <li>the store declines or cannot fulfill the order;</li>
          <li>a paid item is confirmed missing, wrong, damaged, defective, or undelivered; or</li>
          <li>a duplicate or erroneous charge is verified.</li>
        </ul>
        <p>Refunds are generally not available for:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>change of mind after the store has started preparing or dispatched the order;</li>
          <li>
            opened, used, or partially consumed feeds, supplements, medicines, or other agricultural or
            animal-care supplies, except where the product is defective or required to be refundable by law;
          </li>
          <li>perishable or temperature-sensitive goods that cannot be restocked, unless the fault is ours or the store&apos;s;</li>
          <li>buyer unavailability, incomplete address, or refusal to receive an order that was correctly delivered; or</li>
          <li>voucher discounts, except that unused voucher value may be restored when an order is cancelled before fulfillment, subject to the voucher&apos;s own rules and expiry.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. How refunds are issued">
        <p>
          Approved refunds are returned through the original payment method when possible (for example, card,
          GCash, or Maya via PayMongo). If that channel cannot be used, we may use another reasonable method.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Prepaid orders.</strong> After approval, the payment partner typically completes the credit
            within 7 to 15 business days. Your bank or wallet may take additional time to show the amount.
          </li>
          <li>
            <strong>COD orders.</strong> If you have not paid the rider or store, no product refund is due. If
            you already paid in cash, any approved refund will be arranged with the store or through support.
          </li>
          <li>
            <strong>Partial refunds.</strong> If only some items or one shop in a multi-store order is cancelled
            or refunded, we refund the corresponding item amounts and any related fees that no longer apply.
          </li>
        </ul>
        <p>
          Delivery and handling fees are refunded when the related items are cancelled before dispatch. Fees may
          be withheld if a rider has already been sent or a delivery attempt was made, unless the failure was
          caused by the store, rider, or platform.
        </p>
      </LegalSection>

      <LegalSection title="8. Returns">
        <p>
          If a return is required, the store or Klasmeyt support will tell you whether to make the item available
          for pickup, drop it off, or provide photos instead. Returned goods should be unused and in original
          packaging where that is reasonable for the product type.
        </p>
        <p>
          Do not return prescription, veterinary, or hazardous products except as instructed by the store or
          required by law. We may ask for photos, proof of delivery, or other evidence before approving a return
          or refund.
        </p>
      </LegalSection>

      <LegalSection title="9. Disputes">
        <p>
          If you and a store disagree, contact Klasmeyt support with your order code and any photos or chat
          records. We may review order status, payment records, and proof of delivery. Our review does not limit
          rights you have under Philippine consumer-protection law, including complaints you may file with the
          Department of Trade and Industry (DTI).
        </p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>
          We may update this Policy from time to time. The &quot;Last updated&quot; date at the top of this page
          will change when we do. Continued use of Klasmeyt after an update means you accept the revised Policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about cancellations or refunds may be sent to the details below, through in-app support, or
          through the Contact section on the Klasmeyt website.
        </p>
        <LegalContactDetails />
        <p>
          Related documents:{' '}
          <Link href="/terms-and-conditions" className="font-medium text-[#0B132B] underline underline-offset-2">
            Terms and Conditions
          </Link>
          {', '}
          <Link href="/privacy-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Privacy Policy
          </Link>
          {', and '}
          <Link href="/cookie-policy" className="font-medium text-[#0B132B] underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
