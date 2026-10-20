import Merchant from "../models/merchant.model.js";
import Store from "../models/store.model.js";
import Plan from "../models/plan.model.js";
import Subscription from "../models/subscription.model.js";
import { getBillingConfig, USABLE_STATUSES } from "../config/plans.js";
import { toPublicPlan, isContactOnly, isUnlimited } from "./pricing.service.js";

export async function getCurrentSubscription(merchantId) {
  return Subscription.findOne({ merchant: merchantId, isCurrent: true }).sort({ createdAt: -1 });
}

export async function getPlanByCode(code) {
  if (!code) return null;
  return Plan.findOne({ code: String(code).toUpperCase().trim() });
}

export async function getActiveLocationCount(merchantId) {
  return Store.countDocuments({ merchant: merchantId, status: "ACTIVE" });
}

export function buildPlanSnapshot(plan) {
  return {
    code: plan.code,
    displayName: plan.displayName,
    currency: plan.currency || "INR",
    billingInterval: plan.billingInterval || "YEARLY",
    currentAnnualPrice: plan.currentAnnualPrice ?? null,
    referenceAnnualPrice: plan.referenceAnnualPrice ?? null,
    maximumLocations: plan.maximumLocations ?? null,
    unlimitedLocations: isUnlimited(plan),
    features: plan.features || [],
    supportLevel: plan.supportLevel || "BASIC"
  };
}

function addOneYear(date) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

function trialLabel(msLeft) {
  if (msLeft <= 0) return "Trial ended";
  const totalHours = Math.floor(msLeft / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${hours} hour${hours === 1 ? "" : "s"} left`;
  const minutes = Math.max(1, Math.floor(msLeft / (60 * 1000)));
  return hours > 0 ? `${hours} hour${hours === 1 ? "" : "s"} left` : `${minutes} minutes left`;
}

// Single source of truth for what a merchant can currently do. Controllers and
// the frontend both read from this, never from client supplied state.
export async function resolveAccess(merchantId, now = new Date()) {
  const config = getBillingConfig();
  const subscription = await getCurrentSubscription(merchantId);
  const storeCount = await getActiveLocationCount(merchantId);

  if (!subscription) {
    const legacyAccess = config.planEnforcementMode === "SUBSCRIPTION_ONLY";
    return {
      hasPlan: false,
      merchantId,
      subscriptionId: null,
      status: "NONE",
      isTrial: false,
      isUsable: legacyAccess,
      legacyAccess,
      planCode: "",
      plan: null,
      features: [],
      supportLevel: "BASIC",
      maximumLocations: null,
      unlimitedLocations: false,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      accessUntil: null,
      trialStart: null,
      trialEnd: null,
      trialLabel: null,
      autoRenew: false,
      cancelAtPeriodEnd: false,
      renewalStatus: "NONE",
      locationUsage: { used: storeCount, limit: null, unlimited: false, remaining: null, canAdd: legacyAccess },
      restrictions: legacyAccess ? [] : ["NO_PLAN"],
      messages: legacyAccess
        ? ["No plan selected yet. Start the 3-day free trial to unlock a plan."]
        : ["No active plan. Start the 3-day free trial to continue."]
    };
  }

  let status = subscription.status;
  const trialEnded = Boolean(subscription.trialEnd) && subscription.trialEnd <= now;
  const periodEnded = Boolean(subscription.currentPeriodEnd) && subscription.currentPeriodEnd <= now;

  if (status === "TRIALING" && trialEnded) status = "EXPIRED";
  if (["ACTIVE", "PAST_DUE", "CANCELLED"].includes(status) && periodEnded) status = "EXPIRED";

  const accessUntil =
    status === "TRIALING" ? subscription.trialEnd : subscription.currentPeriodEnd || null;

  const isUsable = USABLE_STATUSES.includes(status) && (!accessUntil || accessUntil > now);

  const limit = subscription.planSnapshot?.maximumLocations ?? null;
  const unlimited = Boolean(subscription.planSnapshot?.unlimitedLocations);
  const remaining = unlimited ? null : Math.max(0, (limit ?? 0) - storeCount);

  const restrictions = [];
  if (!isUsable) restrictions.push(status === "TRIALING" ? "TRIAL_INACTIVE" : "PLAN_INACTIVE");
  if (subscription.status === "PAYMENT_PENDING") restrictions.push("PAYMENT_PENDING");
  if (subscription.status === "SUSPENDED") restrictions.push("SUSPENDED");

  const messages = [];
  if (status === "TRIALING") {
    messages.push(`Your trial ends on ${subscription.trialEnd?.toDateString()}.`);
    messages.push(`You have ${storeCount} of ${limit} store locations.`);
  }
  if (status === "ACTIVE" && !cancelAtPeriodEndFlag(subscription)) {
    messages.push(
      unlimited ? "Your current plan allows unlimited locations." : `Your current plan supports up to ${limit} locations.`
    );
  }
  if (subscription.status === "PAYMENT_PENDING") messages.push("Payment verification is pending.");
  if (cancelAtPeriodEndFlag(subscription)) {
    messages.push(`Your cancellation has been scheduled. Access continues until ${subscription.currentPeriodEnd?.toDateString()}.`);
  }
  if (!unlimited && remaining !== null && remaining <= 0 && isUsable) {
    messages.push("You have reached the location limit. Upgrade to add another location.");
  }
  if (status === "EXPIRED") messages.push("Your plan has expired. Upgrade to restore full access.");
  if (status === "SUSPENDED") messages.push("Your subscription is suspended. Contact billing support.");

  const msLeft = subscription.trialEnd ? subscription.trialEnd.getTime() - now.getTime() : 0;

  return {
    hasPlan: true,
    merchantId,
    subscriptionId: subscription._id,
    status,
    rawStatus: subscription.status,
    isTrial: Boolean(subscription.isTrial) && status === "TRIALING",
    isUsable,
    legacyAccess: false,
    planCode: subscription.planCode,
    plan: subscription.planSnapshot ? toPublicPlan(subscription.planSnapshot, now) : null,
    features: subscription.planSnapshot?.features || [],
    supportLevel: subscription.planSnapshot?.supportLevel || "BASIC",
    maximumLocations: limit,
    unlimitedLocations: unlimited,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    accessUntil,
    trialStart: subscription.trialStart,
    trialEnd: subscription.trialEnd,
    trialLabel: status === "TRIALING" ? trialLabel(msLeft) : null,
    autoRenew: subscription.autoRenew,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    cancelledAt: subscription.cancelledAt,
    cancellationReason: subscription.cancellationReason,
    renewalStatus: subscription.renewalStatus,
    locationUsage: { used: storeCount, limit, unlimited, remaining, canAdd: isUsable && (unlimited || (remaining ?? 0) > 0) },
    restrictions,
    messages
  };
}

function cancelAtPeriodEndFlag(subscription) {
  return Boolean(subscription.cancelAtPeriodEnd) && subscription.status !== "EXPIRED";
}

export function hasFeature(access, feature) {
  return Boolean(access?.isUsable) && Array.isArray(access.features) && access.features.includes(feature);
}

// Server side location guard. Hiding the Create Store button is never enough.
export async function assertCanAddLocation(merchantId) {
  const access = await resolveAccess(merchantId);

  if (!access.isUsable) {
    return {
      allowed: false,
      code: "PLAN_INACTIVE",
      message: "Your plan is not active. Start a plan or renew it to add another location.",
      access
    };
  }

  if (access.unlimitedLocations) return { allowed: true, access };

  if (!access.locationUsage.canAdd) {
    return {
      allowed: false,
      code: "LOCATION_LIMIT_REACHED",
      message: `You have reached the location limit for ${access.planCode}. Upgrade to add another location.`,
      access
    };
  }

  return { allowed: true, access };
}

// Trial creation. No payment details needed, only paid features are granted,
// and the unique partial index plus trialUsed flag make repeated/concurrent
// requests idempotent.
export async function startTrial(merchantId, planCode, now = new Date()) {
  const config = getBillingConfig();
  const plan = await getPlanByCode(planCode);

  if (!plan || !plan.isActive) {
    return { ok: false, code: "PLAN_NOT_FOUND", message: "Selected plan is not available" };
  }
  if (isContactOnly(plan)) {
    return { ok: false, code: "PLAN_CONTACT_ONLY", message: "Enterprise is priced on request. Send a quote request instead." };
  }

  const existing = await getCurrentSubscription(merchantId);
  if (existing) {
    if (existing.status === "TRIALING" && existing.planCode === plan.code) {
      return { ok: true, code: "ALREADY_TRIALING", message: "Your free trial is already running", subscription: existing };
    }
    return { ok: false, code: "SUBSCRIPTION_EXISTS", message: "You already have a subscription on this account", subscription: existing };
  }

  const trialUsedBefore = await Subscription.exists({ merchant: merchantId, trialUsed: true });
  if (trialUsedBefore) {
    return { ok: false, code: "TRIAL_ALREADY_USED", message: "The free trial has already been used on this account" };
  }

  const trialEnd = new Date(now.getTime() + config.trialDays * 24 * 60 * 60 * 1000);

  try {
    const subscription = await Subscription.create({
      merchant: merchantId,
      plan: plan._id || null,
      planCode: plan.code,
      planSnapshot: buildPlanSnapshot(plan),
      status: "TRIALING",
      isCurrent: true,
      isTrial: true,
      trialUsed: true,
      trialStart: now,
      trialEnd,
      billingInterval: "YEARLY",
      currency: plan.currency || config.currency,
      agreedAnnualAmount: 0,
      totalPaidAmount: 0,
      autoRenew: false,
      renewalStatus: "NONE",
      activatedBy: "TRIAL"
    });

    return { ok: true, code: "TRIAL_STARTED", message: `Free trial started. ${config.trialDays} days of ${plan.displayName}.`, subscription };
  } catch (error) {
    if (error.code === 11000) {
      const current = await getCurrentSubscription(merchantId);
      if (current && current.status === "TRIALING") {
        return { ok: true, code: "ALREADY_TRIALING", message: "Your free trial is already running", subscription: current };
      }
      return { ok: false, code: "SUBSCRIPTION_EXISTS", message: "You already have a subscription on this account" };
    }
    throw error;
  }
}

// Called only after a verified payment or an explicit admin action.
export async function activatePaidSubscription({
  merchantId,
  plan,
  totals,
  payment = null,
  providerPaymentId = "",
  now = new Date(),
  activatedBy = "PAYMENT"
}) {
  const snapshot = buildPlanSnapshot(plan);
  const periodEnd = addOneYear(now);
  const current = await getCurrentSubscription(merchantId);

  // Already paid for this exact payment, do not grant a second period.
  if (current && providerPaymentId && current.latestPaymentId === providerPaymentId && current.status === "ACTIVE") {
    return { ok: true, code: "ALREADY_ACTIVE", subscription: current };
  }

  if (current && current.status === "TRIALING") {
    current.plan = plan._id || null;
    current.planCode = plan.code;
    current.planSnapshot = snapshot;
    current.status = "ACTIVE";
    current.isTrial = false;
    current.currentPeriodStart = now;
    current.currentPeriodEnd = periodEnd;
    current.agreedAnnualAmount = plan.currentAnnualPrice ?? 0;
    current.discountAmount = totals?.discountAmount ?? 0;
    current.taxAmount = totals?.taxAmount ?? 0;
    current.totalPaidAmount = totals?.payableAmount ?? 0;
    current.cancelAtPeriodEnd = false;
    current.cancelledAt = null;
    current.cancellationReason = "";
    current.renewalStatus = "NONE";
    current.latestPaymentId = providerPaymentId || current.latestPaymentId;
    current.activatedBy = activatedBy;
    if (payment?._id) current.latestPaymentId = providerPaymentId || current.latestPaymentId;
    await current.save();
    return { ok: true, code: "TRIAL_CONVERTED", subscription: current };
  }

  if (current) {
    current.isCurrent = false;
    await current.save();
  }

  const subscription = await Subscription.create({
    merchant: merchantId,
    plan: plan._id || null,
    planCode: plan.code,
    planSnapshot: snapshot,
    status: "ACTIVE",
    isCurrent: true,
    isTrial: false,
    trialUsed: Boolean(current?.trialUsed),
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    billingInterval: "YEARLY",
    currency: plan.currency || "INR",
    agreedAnnualAmount: plan.currentAnnualPrice ?? 0,
    discountAmount: totals?.discountAmount ?? 0,
    taxAmount: totals?.taxAmount ?? 0,
    totalPaidAmount: totals?.payableAmount ?? 0,
    autoRenew: false,
    renewalStatus: "NONE",
    latestPaymentId: providerPaymentId,
    activatedBy
  });

  return { ok: true, code: "ACTIVATED", subscription };
}

export async function findMerchantForUser(userId) {
  return Merchant.findOne({ owner: userId });
}

// Store creation is checked and created one at a time per merchant, so two
// simultaneous requests cannot both pass the location limit check.
const merchantLocks = new Map();

export function withMerchantLock(merchantId, task) {
  const key = String(merchantId);
  const previous = merchantLocks.get(key) || Promise.resolve();
  const current = previous.then(() => task(), () => task());
  const settled = current.then(() => {}, () => {});
  merchantLocks.set(key, settled);
  settled.then(() => {
    if (merchantLocks.get(key) === settled) merchantLocks.delete(key);
  });
  return current;
}
