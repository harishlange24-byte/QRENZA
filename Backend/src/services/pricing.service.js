import { getBillingConfig, REFUND_POLICY } from "../config/plans.js";

// All money is integer paise. Formatting only happens when showing values.
export function formatPaise(paise) {
  if (paise === null || paise === undefined) return null;
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// A plan can be a Mongoose document or a plain object (seed/test data).
export function isContactOnly(plan) {
  return Boolean(plan?.isContactOnly) || plan?.currentAnnualPrice === null || plan?.currentAnnualPrice === undefined;
}

export function isUnlimited(plan) {
  return Boolean(plan?.unlimitedLocations);
}

export function offerIsActive(plan, now = new Date()) {
  const startOk = !plan?.offerStart || new Date(plan.offerStart) <= now;
  const endOk = !plan?.offerEnd || new Date(plan.offerEnd) >= now;
  return startOk && endOk;
}

// The reference price is only ever a display value. The payable amount always
// comes from currentAnnualPrice unless the offer configuration says otherwise.
export function resolveOffer(plan, now = new Date()) {
  const sellingPrice = plan?.currentAnnualPrice ?? null;
  const offerActive = offerIsActive(plan, now);
  const referencePrice = offerActive ? plan?.referenceAnnualPrice ?? null : null;
  const discountAmount =
    referencePrice && sellingPrice && referencePrice > sellingPrice ? referencePrice - sellingPrice : 0;

  return {
    sellingPrice,
    referencePrice,
    discountAmount,
    offerActive: offerActive && discountAmount > 0
  };
}

export function computeTotals(plan, now = new Date()) {
  const config = getBillingConfig();
  const offer = resolveOffer(plan, now);

  if (isContactOnly(plan)) {
    return {
      currency: config.currency,
      billingInterval: config.billingInterval,
      contactOnly: true,
      amount: null,
      referencePrice: null,
      discountAmount: 0,
      offerActive: false,
      baseAmount: null,
      taxLabel: config.taxLabel,
      taxPercent: config.taxPercent,
      taxAmount: null,
      pricesIncludeTax: config.pricesIncludeTax,
      payableAmount: null,
      displayAmount: "Custom",
      displayPayable: "On request"
    };
  }

  const amount = offer.sellingPrice;
  let baseAmount;
  let taxAmount;

  if (config.pricesIncludeTax) {
    // Price already contains tax, so split it out instead of adding it again.
    taxAmount = Math.round((amount * config.taxPercent) / (100 + config.taxPercent));
    baseAmount = amount - taxAmount;
  } else {
    taxAmount = Math.round((amount * config.taxPercent) / 100);
    baseAmount = amount;
  }

  const payableAmount = config.pricesIncludeTax ? amount : amount + taxAmount;

  return {
    currency: config.currency,
    billingInterval: config.billingInterval,
    contactOnly: false,
    amount,
    referencePrice: offer.referencePrice,
    discountAmount: offer.discountAmount,
    offerActive: offer.offerActive,
    baseAmount,
    taxLabel: config.taxLabel,
    taxPercent: config.taxPercent,
    taxAmount,
    pricesIncludeTax: config.pricesIncludeTax,
    payableAmount,
    displayAmount: formatPaise(amount),
    displayReference: formatPaise(offer.referencePrice),
    displayTax: formatPaise(taxAmount),
    displayPayable: formatPaise(payableAmount)
  };
}

export function toPublicPlan(plan, now = new Date()) {
  const totals = computeTotals(plan, now);
  return {
    code: plan.code,
    displayName: plan.displayName,
    description: plan.description || "",
    currency: plan.currency || totals.currency,
    billingInterval: plan.billingInterval || "YEARLY",
    currentAnnualPrice: plan.currentAnnualPrice ?? null,
    referenceAnnualPrice: totals.referencePrice,
    maximumLocations: plan.maximumLocations ?? null,
    unlimitedLocations: isUnlimited(plan),
    features: plan.features || [],
    supportLevel: plan.supportLevel || "BASIC",
    isContactOnly: totals.contactOnly,
    offerActive: totals.offerActive,
    sortOrder: plan.sortOrder ?? 0,
    recommended: plan.code === "GROWTH",
    totals: {
      amount: totals.amount,
      payableAmount: totals.payableAmount,
      referencePrice: totals.referencePrice,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      taxLabel: totals.taxLabel,
      taxPercent: totals.taxPercent,
      pricesIncludeTax: totals.pricesIncludeTax,
      displayAmount: totals.displayAmount,
      displayReference: totals.displayReference,
      displayTax: totals.displayTax,
      displayPayable: totals.displayPayable
    }
  };
}

export function publicPricingConfig() {
  const config = getBillingConfig();
  return {
    currency: config.currency,
    billingInterval: config.billingInterval,
    trialDays: config.trialDays,
    taxLabel: config.taxLabel,
    taxPercent: config.taxPercent,
    pricesIncludeTax: config.pricesIncludeTax,
    supportEmail: config.supportEmail,
    refundPolicy: REFUND_POLICY
  };
}

// Refund eligibility is evaluated on the server from the verified payment.
export function evaluateRefundEligibility(payment, { now = new Date(), renewalUsageSincePayment = false } = {}) {
  const config = getBillingConfig();
  const paidAt = payment?.verifiedAt || payment?.createdAt;
  const daysSince = paidAt ? (now.getTime() - new Date(paidAt).getTime()) / (24 * 60 * 60 * 1000) : Infinity;

  if (payment?.status === "REFUNDED" || payment?.refundAmount > 0) {
    return { eligible: false, basis: "This payment has already been refunded or is under refund." };
  }

  if (payment?.purpose === "RENEWAL") {
    if (daysSince <= REFUND_POLICY.renewalWindowDays && !renewalUsageSincePayment) {
      return { eligible: true, basis: `Renewal refund requested within ${REFUND_POLICY.renewalWindowDays} days and unused since renewal.` };
    }
    return { eligible: false, basis: "Renewal refund window has passed or the service was used after renewal." };
  }

  if (daysSince <= REFUND_POLICY.firstPurchaseWindowDays) {
    return { eligible: true, basis: `First purchase refund requested within ${REFUND_POLICY.firstPurchaseWindowDays} days.` };
  }

  return {
    eligible: false,
    basis: `Outside the ${REFUND_POLICY.firstPurchaseWindowDays} day refund window. The current billing period is generally non-refundable.`
  };
}
