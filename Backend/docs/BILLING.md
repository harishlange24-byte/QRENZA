# Qrenza — Pricing, Subscription, Entitlements and Billing

This document covers how plans, subscriptions, payments, refunds and entitlement
enforcement work in the Qrenza backend, and how to configure online payments.

## 1. Money rules

- Every amount is stored as an **integer number of paise** (`₹999 = 99900` paise).
- Rupees are only produced at display time (`formatPaise`).
- Tax is never charged twice. By default the listed annual price **already includes**
  GST (`PRICES_INCLUDE_TAX=true`), so `computeTotals` splits the tax out of the price
  instead of adding it on top.

## 2. Plan catalogue

Plans live in the database (`Plan` model) and are seeded from
`src/config/plans.js` (`DEFAULT_PLANS`). The seed is idempotent:

```
npm run seed:plans
```

| Code       | Annual price | Reference | Locations | Notes                       |
| ---------- | ------------ | --------- | --------- | --------------------------- |
| BASIC      | ₹999         | ₹1,999    | 1         |                             |
| GROWTH     | ₹2,499       | ₹4,999    | 3         | Recommended, GPS branches   |
| PRO        | ₹4,999       | ₹9,999    | 6         | Dedicated account manager   |
| ENTERPRISE | Custom       | —         | Unlimited | Contact only, priced on request |

The `referenceAnnualPrice` is a display-only value used for the strikethrough price.
**The payable amount always comes from `currentAnnualPrice`**, never the reference.

Each subscription stores a **`planSnapshot`** at purchase time, so later catalogue
price changes never rewrite what a merchant already bought.

## 3. Subscription lifecycle

Statuses: `TRIALING`, `ACTIVE`, `PAYMENT_PENDING`, `PAST_DUE`, `CANCELLED`,
`EXPIRED`, `SUSPENDED`.

- A merchant can hold only **one current subscription**. This is enforced by a
  unique partial index on `Subscription` (`{ merchant: 1 }` where `isCurrent: true`).
- `EXPIRED` is derived from dates at read time (`trialEnd` / `currentPeriodEnd`),
  it is not only a stored value.
- Entitlements are computed in one place — `resolveAccess(merchantId)` — and both the
  API and the UI read from it. The frontend never decides what a merchant can do.

### Free trial

- 3 days by default (`TRIAL_DAYS`), no payment details required.
- One trial per account: guarded by the unique index and a `trialUsed` flag.
- Starting a trial twice returns the existing trial instead of creating a new one.

## 4. Entitlement enforcement

- `planEnforcementMode`:
  - `SUBSCRIPTION_ONLY` (default) — a merchant **without any subscription row** keeps
    full access, so existing accounts are not broken.
  - `STRICT` — a merchant without an active plan is denied paid actions.
- Location limits are enforced **on the server** in `assertCanAddLocation()`, called from
  `createStore` before the store is written. Hiding the "Add store" button is never enough.
- Store creation is serialized per merchant with `withMerchantLock()`, so two simultaneous
  requests cannot both pass the limit check. (The lock is per server process; a multi-instance
  deployment would additionally need a database-level guard.)
- Feature access is checked with `hasFeature(access, "GPS_BRANCH_DETECTION")` etc.

## 5. Razorpay setup

Add these to `Backend/.env` (see `.env.example`):

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

When the keys are missing, checkout returns `503` with code
`RAZORPAY_NOT_CONFIGURED` and the UI shows a clear "payment not configured" message.
**No real payment is ever attempted without keys.**

### Webhook

- Point the Razorpay dashboard webhook to `POST /api/billing/webhook`.
- Subscribe to: `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`.
- The handler verifies the `X-Razorpay-Signature` header against the **raw request body**
  before parsing it.
- Repeated, delayed or out-of-order events are safe: each event id is stored in
  `WebhookEvent` with a unique index, so duplicates are ignored.

### Security

- Checkout signatures are verified server-side with `timingSafeEqual`.
- A plan activates **only** after a verified payment (or an explicit admin action).
- Raw card data is never seen or stored.

## 6. Upgrade, downgrade and Enterprise

- Upgrade/downgrade requests are stored in `PlanChangeRequest` and reviewed by an admin.
  New entitlements apply only after approval (and payment for upgrades).
- Enterprise is contact-only: `POST /api/billing/enterprise` stores a quote request and
  the team follows up.

## 7. Cancellation and refunds

- Cancelling stops the next renewal. Access continues until the end of the paid period.
  Customer data, stores and earned rewards are never deleted.
- Requesting a refund **is not** a processed refund. Requests are reviewed by an admin
  (`requestRefund` → `reviewRefund` → `submitRefund`), and only the explicit
  `submitRefund` step calls the provider.

Refund policy (see `REFUND_POLICY`):

- First purchase: full refund within 7 days.
- Renewal: full refund within 7 days if the service was not used after renewal.
- Duplicate or failed charges: refunded in full.
- Outside these cases the current billing period is generally non-refundable.

## 8. API

Public:

- `GET  /api/plans` — plan catalogue (`plans`, `featureLabels`, `billing`).

Merchant (authenticated):

- `GET  /api/subscription/me` — current access + billing config.
- `GET  /api/subscription/history` — subscriptions and payments.
- `GET  /api/subscription/limits` — just the access payload.
- `POST /api/subscription/trial` — start the free trial (`{ planCode }`).
- `POST /api/billing/checkout` — create an order (`{ planCode }`).
- `POST /api/billing/verify` — verify `{ orderId, paymentId, signature }`.
- `POST /api/billing/cancel` — stop renewal (`{ reason }`).
- `POST /api/billing/plan-change` — request a change (`{ planCode, note }`).
- `POST /api/billing/enterprise` — Enterprise quote request.
- `POST /api/billing/refunds` — request a refund (`{ paymentId, reason }`).

Webhook (signature protected):

- `POST /api/billing/webhook`.

Admin (`SUPER_ADMIN`, mounted at `/api/admin/billing`):

- Plan catalogue: `GET /plans`, `POST /plans`, `PATCH /plans/:code`.
- `GET /subscriptions`, `POST /subscriptions/activate` (the only non-payment
  activation path, audited).
- `GET /payments`.
- `GET /refunds`, `PATCH /refunds/:id` (review), `POST /refunds/:id/submit` (the only
  explicit provider refund call).
- `GET /plan-changes`, `PATCH /plan-changes/:id` (review).
- `GET /audit-logs`.

## 9. Tests

```
npm test
```

44 tests run in two groups.

**Unit tests** (no database, no network) — pricing catalogue (paise amounts, current vs
reference price, offer expiry, contact-only Enterprise), tax handling for both inclusive and
exclusive prices, refund eligibility and duplicate-refund prevention, plan-snapshot
immutability, entitlement status invariants, and the per-merchant store lock.

**Integration tests** (`billing.integration.test.js`) — run against an isolated database named
`qrenza_billing_test_db` taken from `MONGO_URI`, and the database is dropped again afterwards. If
`MONGO_URI` is missing or unreachable, these tests **skip** instead of failing. They cover trial
creation and expiry, repeated and concurrent trial requests, location limits for
Basic/Growth/Pro/Enterprise, suspended stores not counting, failed payments not activating a
plan, verified payments activating the right plan, duplicate webhooks granting no second period,
cancellation keeping access until the period ends, and duplicate provider payment ids being
rejected.

No real payment is ever created and no card data is ever stored.
