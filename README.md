# Qrenza

QR-based loyalty, menu and queue platform for cafes, restaurants and small shops.

- `Backend/` — Node.js (ESM) + Express 5 + Mongoose 9 + MongoDB
- `Frontend/` — React 19 + Vite 7 + Tailwind 4 + Redux Toolkit + react-router 7

Pricing, subscription and billing details live in
[Backend/docs/BILLING.md](Backend/docs/BILLING.md).

## 1. Installation

### Backend

```bash
cd Backend
npm install
cp .env.example .env      # then fill in the real values
npm run seed:plans        # writes the plan catalogue into the database
npm run dev               # http://localhost:3000
```

### Frontend

```bash
cd Frontend
npm install
npm run dev               # http://localhost:5173
```

## 2. Environment variables

`Backend/.env.example` lists every variable with placeholder values only. Secrets are
never committed.

| Group     | Variables                                                        |
| --------- | ---------------------------------------------------------------- |
| Server    | `PORT`, `NODE_ENV`                                               |
| Database  | `MONGO_URI`                                                      |
| Auth      | `JWT_SECRET`, `OTP_HASH`                                         |
| Uploads   | `urlEndpoint`, `publicKey`, `privateKey` (ImageKit)              |
| Messaging | `TEXTBEE_API_KEY`, `TEXTBEE_DEVICE_ID`                           |
| Payments  | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| Billing   | `BILLING_CURRENCY`, `TRIAL_DAYS`, `BILLING_TAX_PERCENT`, `BILLING_TAX_LABEL`, `PRICES_INCLUDE_TAX`, `REFUND_WINDOW_DAYS`, `BILLING_SUPPORT_EMAIL`, `PLAN_ENFORCEMENT_MODE` |

## 3. Billing configuration

- Plans are stored in the database and seeded from `Backend/src/config/plans.js`
  (`npm run seed:plans`, idempotent). Prices are integer **paise** (`₹999 = 99900`).
- Billing settings are read from the environment at call time, so an offer can expire or a
  tax rate can change without a code change.
- `PLAN_ENFORCEMENT_MODE` defaults to `SUBSCRIPTION_ONLY`, which keeps existing merchants
  that have no subscription row working. `STRICT` denies paid actions without an active plan.
- Razorpay is optional. Without keys, checkout returns `503 RAZORPAY_NOT_CONFIGURED` and the
  UI says payment is not configured — it never fakes a success.

### Razorpay setup

1. Put `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `Backend/.env`.
2. In the Razorpay dashboard add a webhook pointing to `POST /api/billing/webhook`.
3. Subscribe to `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`.

## 4. Tests

```bash
cd Backend
npm test              # 44 tests: unit + integration
npm run test:models   # verifies every model is registered
```

Unit tests need nothing external. Integration tests use an isolated database
(`qrenza_billing_test_db`) derived from `MONGO_URI` and drop it afterwards; if the database is
not reachable they skip instead of failing. No real payment is ever made.

## 5. Page map

- Public: `/`, `/pricing`, `/login`
- Merchant: `/merchant` (dashboard), `/merchant/stores`, `/merchant/billing`, and the rest of
  the merchant shell.

## 6. Implementation status

Implemented:

- Real pricing page with four plan cards, reference-price strikethrough, an accessible
  comparison table, FAQ, trial CTA, Enterprise quote form and refund policy links.
- Centralized plan catalogue with current/reference prices, location limits, features and
  configurable offers.
- Subscription, payment transaction, webhook event, plan change and refund models, with
  unique constraints against duplicate current subscriptions and duplicate payments.
- `planSnapshot` on every subscription, so catalogue price changes never rewrite a past purchase.
- Trial lifecycle (3 days, no payment details, idempotent, expiry derived from server time).
- Razorpay checkout with server-side order creation, signature verification and idempotent
  raw-body webhook handling.
- Tax shown once, split out of an inclusive price and never charged twice.
- Upgrade/downgrade requests, Enterprise quote requests, cancellation and a reviewed refund
  workflow (requesting a refund is not the same as a processed refund).
- Server-side entitlements via `resolveAccess()`, including a store-creation location guard
  that cannot be bypassed by hiding UI, serialized per merchant.
- Merchant billing page: current plan, trial countdown, location usage, plan actions, cancel,
  refund request, Enterprise request, subscription and payment history.
- Admin billing APIs for plan configuration, subscriptions, payments, refunds, plan changes
  and audit logs.
- Documentation: this file, `Backend/.env.example`, `Backend/docs/BILLING.md`.

Remaining configuration (not code):

- Add the Razorpay keys to enable real checkout.
- Run `npm run seed:plans` against each environment.

Known limitations:

- Automatic renewal is not enabled; annual renewal is a manual repeat payment. The UI states
  this instead of claiming recurring billing.
- Administration is exposed as protected `/api/admin/billing` endpoints. There is no separate
  admin user interface in this repository.
- The per-merchant store lock is in-process, so a horizontally scaled deployment would need an
  additional database-level guard.
