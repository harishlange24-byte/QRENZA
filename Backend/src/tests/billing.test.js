import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PLANS,
  REFUND_POLICY,
  SUBSCRIPTION_STATUSES,
  USABLE_STATUSES,
  getBillingConfig
} from "../config/plans.js";
import { computeTotals, evaluateRefundEligibility, publicPricingConfig } from "../services/pricing.service.js";
import { buildPlanSnapshot, withMerchantLock } from "../services/entitlement.service.js";

const planObject = (code) => JSON.parse(JSON.stringify(DEFAULT_PLANS.find((plan) => plan.code === code)));
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("billing defaults keep the three day trial and Indian tax settings", () => {
  const config = getBillingConfig();
  assert.equal(config.trialDays, 3);
  assert.equal(config.currency, "INR");
  assert.equal(config.billingInterval, "YEARLY");
  assert.equal(config.taxPercent, 18);
  assert.equal(config.taxLabel, "GST");
  assert.equal(config.pricesIncludeTax, true);
  // Existing merchants without a subscription row must keep working.
  assert.equal(config.planEnforcementMode, "SUBSCRIPTION_ONLY");
});

test("the public billing config exposes the trial and refund information", () => {
  const config = publicPricingConfig();
  assert.equal(config.trialDays, 3);
  assert.equal(config.refundPolicy.firstPurchaseWindowDays, 7);
  assert.match(config.refundPolicy.processingNote, /5-7 working days/);
});

test("tax is added exactly once when the listed price excludes it", () => {
  const saved = process.env.PRICES_INCLUDE_TAX;
  process.env.PRICES_INCLUDE_TAX = "false";

  const totals = computeTotals(planObject("BASIC"));
  assert.equal(totals.pricesIncludeTax, false);
  assert.equal(totals.baseAmount, 99900);
  assert.equal(totals.taxAmount, 17982);
  assert.equal(totals.payableAmount, 99900 + 17982);

  if (saved === undefined) delete process.env.PRICES_INCLUDE_TAX;
  else process.env.PRICES_INCLUDE_TAX = saved;
});

test("the refund policy windows are configuration, not scattered rules", () => {
  assert.equal(REFUND_POLICY.firstPurchaseWindowDays, 7);
  assert.equal(REFUND_POLICY.renewalWindowDays, 7);
  assert.equal(REFUND_POLICY.renewalRequiresNoUsage, true);
  assert.equal(REFUND_POLICY.currentPeriodGenerallyNonRefundable, true);
});

test("a first purchase is refundable inside the 7 day window", () => {
  const result = evaluateRefundEligibility({ status: "PAID", purpose: "SUBSCRIPTION", verifiedAt: daysAgo(3) });
  assert.equal(result.eligible, true);
});

test("a first purchase is not refundable outside the window", () => {
  const result = evaluateRefundEligibility({ status: "PAID", purpose: "SUBSCRIPTION", verifiedAt: daysAgo(30) });
  assert.equal(result.eligible, false);
});

test("an already refunded payment cannot be refunded twice", () => {
  const refunded = evaluateRefundEligibility({ status: "REFUNDED", purpose: "SUBSCRIPTION", verifiedAt: daysAgo(1) });
  assert.equal(refunded.eligible, false);

  const partial = evaluateRefundEligibility({
    status: "PAID",
    purpose: "SUBSCRIPTION",
    verifiedAt: daysAgo(1),
    refundAmount: 5000
  });
  assert.equal(partial.eligible, false);
});

test("a renewal is refundable only inside the window and while unused", () => {
  const fresh = evaluateRefundEligibility({ status: "PAID", purpose: "RENEWAL", verifiedAt: daysAgo(2) });
  assert.equal(fresh.eligible, true);

  const used = evaluateRefundEligibility(
    { status: "PAID", purpose: "RENEWAL", verifiedAt: daysAgo(2) },
    { renewalUsageSincePayment: true }
  );
  assert.equal(used.eligible, false);

  const late = evaluateRefundEligibility({ status: "PAID", purpose: "RENEWAL", verifiedAt: daysAgo(20) });
  assert.equal(late.eligible, false);
});

test("a subscription snapshot keeps the price that was actually purchased", () => {
  const plan = planObject("GROWTH");
  const snapshot = buildPlanSnapshot(plan);

  // A later catalogue price change must never rewrite a past purchase.
  plan.currentAnnualPrice = 999900;
  plan.maximumLocations = 99;

  assert.equal(snapshot.code, "GROWTH");
  assert.equal(snapshot.currentAnnualPrice, 249900);
  assert.equal(snapshot.maximumLocations, 3);
  assert.equal(snapshot.unlimitedLocations, false);
});

test("the Enterprise snapshot records unlimited locations explicitly", () => {
  const snapshot = buildPlanSnapshot(planObject("ENTERPRISE"));
  assert.equal(snapshot.unlimitedLocations, true);
  assert.equal(Array.isArray(snapshot.features), true);
});

test("only the configured statuses grant paid access", () => {
  assert.equal(
    USABLE_STATUSES.every((status) => SUBSCRIPTION_STATUSES.includes(status)),
    true
  );
  assert.equal(USABLE_STATUSES.includes("EXPIRED"), false);
  assert.equal(USABLE_STATUSES.includes("SUSPENDED"), false);
  assert.equal(USABLE_STATUSES.includes("PAYMENT_PENDING"), false);
});

test("concurrent store creations for one merchant are serialized", async () => {
  let active = 0;
  let maxActive = 0;

  const task = async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await wait(10);
    active--;
  };

  await Promise.all([1, 2, 3, 4, 5].map(() => withMerchantLock("lock-test-merchant", task)));
  assert.equal(maxActive, 1);
});

test("different merchants are not blocked by each other", async () => {
  let active = 0;
  let maxActive = 0;

  const task = async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await wait(10);
    active--;
  };

  await Promise.all([
    withMerchantLock("parallel-merchant-a", task),
    withMerchantLock("parallel-merchant-b", task)
  ]);
  assert.equal(maxActive, 2);
});

test("a rejected locked task does not block the next task for that merchant", async () => {
  await assert.rejects(() => withMerchantLock("lock-recovery-merchant", async () => {
    throw new Error("boom");
  }));

  const result = await withMerchantLock("lock-recovery-merchant", async () => "ok");
  assert.equal(result, "ok");
});
