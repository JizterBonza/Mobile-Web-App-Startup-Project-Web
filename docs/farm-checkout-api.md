# Farm checkout API

This is the backend contract for the customer app, farm dashboard, shipping partner integration, and admin operations. The customer and partner screens are separate work. Refunds, delivery execution, and payouts are not implemented here.

## Deployment

1. Back up the database and deploy the application and migration together.
2. Run `php artisan migrate`. The additive migration enables the shipping partner role, reservations, farm order tables, staged payment fields, and nullable unconfirmed totals. Do not send farm traffic before migration completes.
3. Keep Laravel storage dates in UTC (`APP_TIMEZONE=UTC`). Customer deadlines use Asia/Manila regardless of the server's operating system timezone.
4. Configure the existing PayMongo secret, base URL, and signed webhook. Keep the existing `POST /api/payment/webhook` subscribed to checkout and payment paid/failed events.
5. Run Laravel's scheduler every minute (`php artisan schedule:run`). It invokes `farm-orders:check-payments`, opens balance windows, and holds overdue orders without waiting on provider network calls. Signed webhooks and payment-status requests reconcile payments. Existing in-app notification APIs serve all recipients.
6. Admins can create shipping partner accounts through Accounts. They authenticate using the existing `POST /api/login` flow and use the returned bearer token.

The rollback drops the new farm tables and payment fields. It deliberately retains the additive role and nullable legacy total columns to avoid invalidating existing accounts or unconfirmed order totals. Financial records must be preserved before any rollback.

## Authentication and identifiers

Use `Authorization: Bearer <token>` and `Accept: application/json`. All actors must be active. Customer cart and checkout actions reject non-customers. Owners see only their farm's deposit-paid orders; partners see only assigned deposit-paid orders; admins can review all farm orders.

Every `{id}` in a farm order URL is the shared `orders.id`, not the internal `farm_orders.id`. Unauthorized order reads return 404. Farm orders cannot be edited, cancelled, or paid through legacy shop mutation endpoints.

Money is PHP, returned as decimal strings. Bird counts and quantities are integers. Timestamps in responses are UTC ISO 8601. Pickup and release dates are Manila calendar dates.

## Customer checkout

### Cart

- `GET /api/farm-cart`: `data` is an array of `{farm_id, farm_name, items}` groups. Each item includes its cart `id`, `listing_id`, quantity, price, required bird count, and available birds.
- `POST /api/farm-cart/items`: `{ "listing_id": 12, "quantity": 2 }`. Adds to an existing quantity for the same listing. Returns 201.
- `PATCH /api/farm-cart/items/{id}`: `{ "quantity": 3 }`. Sets an absolute quantity; it does not increment it.
- `DELETE /api/farm-cart/items/{id}`: removes an owned entry.

Cart entries do not reserve birds. A quantity counts selling units: head=1 bird, pair=2, trio=3, quadruplet=4, dozen=12. Listing stock counts individual birds. Each listing has independent stock, including bundles.

### Quote

`POST /api/farm-checkout/quote`

```json
{
  "farm_id": 1,
  "cart_item_ids": [31, 32],
  "fulfillment_method": "delivery",
  "shipping_address_id": 8,
  "order_instruction": "Call on arrival"
}
```

Select entries from exactly one farm. Delivery requires the customer's active address. For `fulfillment_method: "pickup"`, omit the address; the farm location is the pickup location.

The `data` response includes `items`, `bird_count`, `box_count`, `chicken_subtotal`, `deposit_due`, `shipping_estimate_min`, `shipping_estimate_max`, `estimated_total_min`, `estimated_total_max`, `earliest_release_date`, and `quote_token`. Token lifetime is ten minutes. Quotes reserve no inventory and are not a guarantee of availability.

The deposit is 30% of chicken subtotal, rounded half up to centavos. A double box holds two birds. Estimated shipping is PHP 2,500–3,500 per box. Direct pickup has zero shipping. Delivery's `final_shipping_fee` remains null until the assigned partner confirms it; estimates are never collected with the deposit. Preorders use the latest listing release date as the earliest pickup date.

### Create order

`POST /api/farm-orders`, with `Idempotency-Key: <unique-checkout-key>`:

```json
{ "quote_token": "<token from quote>" }
```

Returns 201 with the order summary, or 200 for an identical replay. Reusing the same key with a different token returns 409. An identical successful replay still works after the quote expires. Changed prices, cart quantities, address details, or availability require a fresh quote.

Creation reserves birds, saves purchase snapshots, removes only the selected cart entries, and persists an `awaiting_session` deposit payment request. It does not call PayMongo while creating the order. Cancellation does not automatically restore cart entries.

### Pay deposit or balance

`POST /api/farm-orders/{id}/payment-session`

```json
{ "purpose": "deposit" }
```

Use `"balance"` for the final stage. The server chooses the amount; client-supplied amounts have no effect. A normal response contains:

```json
{
  "success": true,
  "data": {
    "payment_id": 10,
    "purpose": "deposit",
    "status": "pending",
    "amount": "3000.00",
    "currency": "PHP",
    "checkout_url": "https://checkout.paymongo.com/...",
    "session_id": "cs_..."
  }
}
```

Open `checkout_url`, then poll `GET /api/payment/status/{id}` or read `GET /api/farm-orders/{id}`. Redirects and client assertions never prove payment. A successful deposit is `partially_paid`; only the full confirmed total is `paid`. Existing payable sessions are resumed instead of duplicated.

Session responses may be 202 with `creating` or `creation_unknown` and no URL. Preserve the order and retry its status; never create a second order or payment to work around an ambiguous provider result. A definite provider rejection returns 503 with `creation_failed` and allows another session request. An ambiguous timeout remains blocked for provider reconciliation/operations review; it is logged with the payment ID. The persisted `attempt_key` is sent in provider metadata so an eventual signed callback can recover the association.

### Tracking and cancellation

- `GET /api/farm-orders`: paginated `data` containing order summaries. Also available to farm owners and admins with role-scoped results.
- `GET /api/farm-orders/{id}`: summary with immutable items, deposit, estimates, final totals, amount paid, remaining balance, partner, pickup date, payment window, hold state, release authorization, and tracking events.
- `GET /api/payment/status/{id}`: includes `is_paid`, `payment_status`, `amount_paid`, `remaining_balance`, and the farm summary in `data`.
- `POST /api/farm-orders/{id}/cancel`: cancels only before a deposit is confirmed. Payable sessions must first be verified closed. Paid, processing, or unverified payments return 409 and retain inventory. A repeated successful cancellation is safe. Paid deposit cancellation requires admin review; no refund or forfeiture occurs automatically.

Unpaid orders have no automatic reservation timer. Closing the app, a cancel redirect, or an individual failed payment attempt does not free inventory. Verified terminal session closure releases an unpaid order's reservation once.

## Farm, admin, and shipping partner operations

1. Verified deposit payment allocates the reserved birds once and notifies the customer, farm owner, and admins.
2. The farm owner calls `POST /api/farm-orders/{id}/confirm`.
3. An admin calls `PUT /api/admin/farm-orders/{id}/shipping-partner` with `{ "shipping_partner_id": 25 }`. Assignment may occur before or after farm confirmation. It notifies the assigned active partner. Reassignment after scheduling is rejected.
4. The partner reads `GET /api/shipping-partner/farm-orders` and calls `PUT /api/farm-orders/{id}/shipping-confirmation` after farm confirmation:

```json
{ "per_box_fee": "2700.00", "pickup_date": "2026-11-10" }
```

The server calculates box count and final shipping. The partner cannot change quantities or chicken prices. With four birds, two boxes at PHP 2,700 cost PHP 5,400. Chicken subtotal PHP 10,000 plus shipping PHP 2,700, less deposit PHP 3,000, produces a balance of PHP 9,700.

For direct customer pickup, the farm instead calls `PUT /api/farm-orders/{id}/pickup-schedule` with `{ "pickup_date": "2026-11-10" }`. Shipping remains zero. No shipping partner is assigned.

Pickup must be at least two Manila calendar days ahead and not precede the saved release date. For November 10 pickup, balance opens November 3 at 00:00 Manila and is due November 9 at 23:59:59 Manila. Confirmation inside the seven-day window opens payment immediately. No automatic debit occurs: the customer opens a balance checkout.

Updating a quote or schedule closes existing unpaid balance sessions first. An ongoing, paid, or unverifiable payment blocks the change. Changes increment `schedule_version`, update tracking, and notify the customer. Fully paid shipping adjustments are rejected.

## Holds and release

The minute scheduler puts overdue unpaid balances on hold, notifying customer, farm, partner, and admins. Deposit money is neither refunded nor forfeited. A late successful payment is recorded but does not clear the hold or authorize release.

Admins can resolve a deadline hold with `PUT /api/admin/farm-orders/{id}/resolve-hold`:

```json
{ "pickup_date": "2026-11-15", "reason": "New date agreed with customer and shipper" }
```

The endpoint retains financial amounts, verifies/ends existing payment sessions, requires a future valid date, records the reason, and schedules a new window. It can resolve a fully paid late order without altering its shipping price. Holds involving unexpected post-cancellation payments or overpayments require separate financial/inventory review and are not automatically cleared.

Release authorization requires verified full payment, farm confirmation, a confirmed pickup date, allocated inventory, and no hold. The farm and partner receive deduplicated release notices. Authorization is for the confirmed date; delivery execution and proof of actual pickup are separate features.

## Errors and verification

- 401: unauthenticated; 403: forbidden actor; 404: missing or inaccessible resource.
- 409: stale quote, stock conflict, idempotency conflict, payment window closed, or unsafe payment/schedule transition.
- 422: invalid input, address, selling unit, or pickup date.
- Provider webhook processing failures return 500 so they can be retried instead of acknowledging an unrecorded payment.

Run `php vendor/phpunit/phpunit/phpunit tests/Feature/FarmCheckoutTest.php`. Tests build an isolated SQLite database, run the actual migration, fake provider requests, and exercise both payment stages and scheduling. They never migrate the configured application database or charge a live payment.
