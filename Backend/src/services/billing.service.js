import PaymentTransaction from "../models/paymentTransaction.model.js";
import { computeTotals } from "./pricing.service.js";
import { activatePaidSubscription, getCurrentSubscription, resolveAccess, getPlanByCode } from "./entitlement.service.js";

// Marks a transaction paid and activates the plan. Safe to call twice: a
// transaction that is already PAID never grants a second subscription period.
export async function settleVerifiedPayment({ transaction, paymentId = "", eventId = "", now = new Date() }) {
  const plan = await getPlanByCode(transaction.planCode);
  if (!plan) {
    const error = new Error("Plan for this payment no longer exists");
    error.code = "PLAN_NOT_FOUND";
    throw error;
  }

  if (transaction.status === "PAID") {
    return {
      alreadyPaid: true,
      access: await resolveAccess(transaction.merchant, now),
      subscription: null
    };
  }

  const totals = computeTotals(plan, now);

  transaction.status = "PAID";
  transaction.verifiedAt = transaction.verifiedAt || now;
  if (paymentId) transaction.providerPaymentId = paymentId;
  if (eventId && !transaction.webhookEventIds.includes(eventId)) transaction.webhookEventIds.push(eventId);
  transaction.failureReason = "";
  await transaction.save();

  const result = await activatePaidSubscription({
    merchantId: transaction.merchant,
    plan,
    totals,
    payment: transaction,
    providerPaymentId: paymentId || transaction.providerPaymentId,
    now
  });

  if (result.subscription && String(result.subscription._id) !== String(transaction.subscription)) {
    transaction.subscription = result.subscription._id;
    await transaction.save();
  }

  return {
    alreadyPaid: false,
    access: await resolveAccess(transaction.merchant, now),
    subscription: result.subscription
  };
}

export async function markPaymentFailed({ transaction, reason, paymentId = "", eventId = "" }) {
  if (transaction.status !== "PAID") {
    transaction.status = "FAILED";
    transaction.failureReason = String(reason || "Payment failed at provider").slice(0, 300);
    if (paymentId) transaction.providerPaymentId = paymentId;
  }
  if (eventId && !transaction.webhookEventIds.includes(eventId)) transaction.webhookEventIds.push(eventId);
  await transaction.save();

  const subscription = await getCurrentSubscription(transaction.merchant);
  if (subscription && subscription.status === "TRIALING") {
    subscription.status = "PAYMENT_PENDING";
    subscription.renewalStatus = "FAILED";
    await subscription.save();
  }

  return transaction;
}

export function findTransactionByOrder(orderId, merchantId = null) {
  const query = { providerOrderId: orderId };
  if (merchantId) query.merchant = merchantId;
  return PaymentTransaction.findOne(query);
}

export function findTransactionByPayment(paymentId) {
  if (!paymentId) return null;
  return PaymentTransaction.findOne({ providerPaymentId: paymentId });
}
