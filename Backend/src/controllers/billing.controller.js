import crypto from "node:crypto";

import PaymentTransaction from "../models/paymentTransaction.model.js";
import PlanChangeRequest from "../models/planChangeRequest.model.js";
import RefundRequest from "../models/refundRequest.model.js";
import WebhookEvent from "../models/webhookEvent.model.js";

import * as razorpay from "../services/razorpay.service.js";
import { USABLE_STATUSES } from "../config/plans.js";
import { computeTotals, toPublicPlan, isContactOnly, evaluateRefundEligibility } from "../services/pricing.service.js";
import { resolveAccess, getCurrentSubscription, getPlanByCode, findMerchantForUser } from "../services/entitlement.service.js";
import { settleVerifiedPayment, markPaymentFailed, findTransactionByOrder } from "../services/billing.service.js";
import { recordAudit } from "../utils/audit.js";

function limitRank(plan) {
  return plan.unlimitedLocations ? Number.MAX_SAFE_INTEGER : plan.maximumLocations ?? 0;
}

// 1-6 of the checkout flow. The amount always comes from the backend catalogue.
const createCheckout = async (req, res) => {
  try {
    const { planCode } = req.body;

    if (!planCode || typeof planCode !== "string") {
      return res.status(400).json({ success: false, message: "planCode is required" });
    }

    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }
    if (merchant.status !== "ACTIVE") {
      return res.status(403).json({ success: false, message: "Merchant account is not active" });
    }

    const plan = await getPlanByCode(planCode);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Selected plan is not available" });
    }
    if (isContactOnly(plan)) {
      return res.status(400).json({
        success: false,
        code: "PLAN_CONTACT_ONLY",
        message: "Enterprise is priced on request. Send a quote request instead."
      });
    }

    const totals = computeTotals(plan);

    if (!razorpay.isConfigured()) {
      return res.status(503).json({
        success: false,
        code: "RAZORPAY_NOT_CONFIGURED",
        message: "Online payment is not configured yet. Add Razorpay keys on the server to enable checkout.",
        configured: false,
        plan: toPublicPlan(plan),
        totals
      });
    }

    const order = await razorpay.createOrder({
      amount: totals.payableAmount,
      currency: totals.currency,
      receipt: `sub_${merchant._id}_${Date.now()}`,
      notes: { planCode: plan.code, merchantId: String(merchant._id) }
    });

    const current = await getCurrentSubscription(merchant._id);

    const transaction = await PaymentTransaction.create({
      merchant: merchant._id,
      subscription: current?._id || null,
      planCode: plan.code,
      purpose: "SUBSCRIPTION",
      providerOrderId: order.id,
      amount: totals.payableAmount,
      currency: totals.currency,
      status: "CREATED",
      idempotencyKey: order.id,
      notes: {
        baseAmount: totals.baseAmount,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount
      }
    });

    return res.status(201).json({
      success: true,
      message: "Checkout created. The plan activates only after a verified payment.",
      configured: true,
      keyId: razorpay.getPublicKeyId(),
      order: { id: order.id, amount: order.amount, currency: order.currency },
      plan: toPublicPlan(plan),
      totals,
      transactionId: transaction._id
    });
  } catch (error) {
    console.error("createCheckout error : ", error.message);
    if (error.code === "RAZORPAY_NOT_CONFIGURED" || error.code === "RAZORPAY_REQUEST_FAILED") {
      return res.status(503).json({
        success: false,
        code: error.code,
        message: "Payment provider is unavailable right now. No payment was taken."
      });
    }
    return res.status(500).json({ success: false, message: "Unable to start checkout" });
  }
};

// 7-8 of the checkout flow. The frontend signature is verified, never trusted.
const verifyCheckout = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({
        success: false,
        message: "orderId, paymentId and signature are required"
      });
    }

    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const transaction = await findTransactionByOrder(orderId, merchant._id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "No payment order found for this merchant" });
    }

    const valid = razorpay.verifyPaymentSignature({ orderId, paymentId, signature });

    if (!valid) {
      await markPaymentFailed({ transaction, reason: "Signature verification failed", paymentId });
      await recordAudit(req, {
        action: "PAYMENT_VERIFY_FAILED",
        entityType: "PaymentTransaction",
        entityId: transaction._id,
        merchant: merchant._id
      });
      return res.status(400).json({
        success: false,
        code: "INVALID_SIGNATURE",
        message: "Payment verification failed. The payment was not accepted."
      });
    }

    const result = await settleVerifiedPayment({ transaction, paymentId });

    await recordAudit(req, {
      action: "PAYMENT_VERIFIED",
      entityType: "PaymentTransaction",
      entityId: transaction._id,
      merchant: merchant._id,
      details: { planCode: transaction.planCode, amount: transaction.amount }
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyPaid ? "Payment already verified" : "Payment verified. Your plan is active.",
      access: result.access
    });
  } catch (error) {
    console.error("verifyCheckout error : ", error.message);
    if (error.code === "PLAN_NOT_FOUND") {
      return res.status(409).json({ success: false, message: "The plan for this payment is no longer available" });
    }
    return res.status(500).json({ success: false, message: "Unable to verify payment" });
  }
};

// 9. Idempotent webhook handling for repeated, delayed and out of order events.
const handleWebhook = async (req, res) => {
  try {
    if (!razorpay.isWebhookConfigured()) {
      return res.status(503).json({
        success: false,
        code: "WEBHOOK_NOT_CONFIGURED",
        message: "Webhook secret is not configured on the server."
      });
    }

    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody;

    if (!rawBody || !razorpay.verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, code: "INVALID_SIGNATURE", message: "Invalid webhook signature" });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid webhook payload" });
    }

    const eventType = payload?.event || "";
    const eventId =
      req.headers["x-razorpay-event-id"] ||
      payload?.id ||
      `${eventType}_${payload?.created_at || Date.now()}`;

    let event;
    try {
      event = await WebhookEvent.create({
        eventId,
        eventType,
        payloadHash: crypto.createHash("sha256").update(rawBody).digest("hex")
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({ success: true, message: "Duplicate webhook ignored" });
      }
      throw error;
    }

    try {
      const outcome = await processWebhookEvent({ eventType, payload, eventId });
      event.status = outcome.status;
      event.error = outcome.error || "";
      event.processedAt = new Date();
      await event.save();
      return res.status(200).json({ success: true, message: outcome.message });
    } catch (error) {
      event.status = "FAILED";
      event.error = String(error.message).slice(0, 300);
      event.processedAt = new Date();
      await event.save();
      console.error("Webhook processing error : ", error.message);
      return res.status(200).json({ success: false, message: "Webhook received but processing failed" });
    }
  } catch (error) {
    console.error("handleWebhook error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to process webhook" });
  }
};

async function processWebhookEvent({ eventType, payload, eventId }) {
  if (eventType === "payment.captured" || eventType === "order.paid") {
    const payment = payload?.payload?.payment?.entity;
    const orderId = payment?.order_id;
    if (!orderId) return { status: "IGNORED", message: "No order reference in event" };

    const transaction = await PaymentTransaction.findOne({ providerOrderId: orderId });
    if (!transaction) return { status: "IGNORED", message: "No matching transaction" };

    await settleVerifiedPayment({ transaction, paymentId: payment.id, eventId });
    return { status: "PROCESSED", message: "Payment applied once" };
  }

  if (eventType === "payment.failed") {
    const payment = payload?.payload?.payment?.entity;
    const transaction = await PaymentTransaction.findOne({ providerOrderId: payment?.order_id });
    if (!transaction) return { status: "IGNORED", message: "No matching transaction" };

    await markPaymentFailed({
      transaction,
      reason: payment?.error_description || "Payment failed at provider",
      paymentId: payment?.id,
      eventId
    });
    return { status: "PROCESSED", message: "Failed payment recorded" };
  }

  if (eventType === "refund.processed" || eventType === "refund.created") {
    const refund = payload?.payload?.refund?.entity;
    const transaction = refund?.payment_id
      ? await PaymentTransaction.findOne({ providerPaymentId: refund.payment_id })
      : null;

    if (!transaction) return { status: "IGNORED", message: "No matching transaction for refund" };

    const amount = Number(refund?.amount || 0);
    transaction.refundAmount = (transaction.refundAmount || 0) + amount;
    transaction.refundedAt = new Date();
    transaction.status =
      transaction.refundAmount >= transaction.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    if (eventId && !transaction.webhookEventIds.includes(eventId)) transaction.webhookEventIds.push(eventId);
    await transaction.save();

    await RefundRequest.updateMany(
      { payment: transaction._id, status: "APPROVED" },
      { $set: { status: "PROCESSED", processedAt: new Date(), providerRefundId: refund?.id || "" } }
    );

    return { status: "PROCESSED", message: "Refund recorded" };
  }

  return { status: "IGNORED", message: `Event ${eventType} is not handled` };
}

// Prevents the next renewal and keeps access until the paid period ends.
const cancelRenewal = async (req, res) => {
  try {
    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const subscription = await getCurrentSubscription(merchant._id);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "No subscription to cancel" });
    }
    if (subscription.status === "CANCELLED") {
      return res.status(409).json({ success: false, message: "Cancellation is already scheduled" });
    }
    if (!USABLE_STATUSES.includes(subscription.status)) {
      return res.status(409).json({ success: false, message: "This subscription is not active" });
    }

    subscription.status = "CANCELLED";
    subscription.cancelAtPeriodEnd = true;
    subscription.autoRenew = false;
    subscription.renewalStatus = "NONE";
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = String(req.body.reason || "").slice(0, 500);
    await subscription.save();

    await recordAudit(req, {
      action: "SUBSCRIPTION_CANCELLED",
      entityType: "Subscription",
      entityId: subscription._id,
      merchant: merchant._id,
      details: { reason: subscription.cancellationReason }
    });

    const paidUntil = subscription.currentPeriodEnd || subscription.trialEnd;
    const access = await resolveAccess(merchant._id);

    return res.status(200).json({
      success: true,
      message: `Cancellation scheduled. Access continues until ${
        paidUntil ? paidUntil.toDateString() : "the end of the current period"
      }.`,
      access
    });
  } catch (error) {
    console.error("cancelRenewal error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to cancel subscription" });
  }
};

// Requesting a refund is not the same as a processed refund.
const requestRefund = async (req, res) => {
  try {
    const { paymentId, reason, details } = req.body;

    if (!paymentId || !reason) {
      return res.status(400).json({ success: false, message: "paymentId and reason are required" });
    }

    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const payment = await PaymentTransaction.findOne({ _id: paymentId, merchant: merchant._id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Verified payment not found for this merchant" });
    }
    if (payment.status !== "PAID") {
      return res.status(400).json({
        success: false,
        code: "PAYMENT_NOT_PAID",
        message: "Only a verified, paid transaction can be refunded"
      });
    }

    const existing = await RefundRequest.findOne({
      payment: payment._id,
      status: { $in: ["PENDING", "APPROVED", "PROCESSED"] }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "A refund request already exists for this payment" });
    }

    const evaluation = evaluateRefundEligibility(payment);

    const refundRequest = await RefundRequest.create({
      merchant: merchant._id,
      payment: payment._id,
      providerPaymentId: payment.providerPaymentId,
      amountRequested: payment.amount,
      reason: String(reason).slice(0, 1000),
      details: String(details || "").slice(0, 2000),
      eligible: evaluation.eligible,
      policyBasis: evaluation.basis,
      status: "PENDING"
    });

    await recordAudit(req, {
      action: "REFUND_REQUESTED",
      entityType: "RefundRequest",
      entityId: refundRequest._id,
      merchant: merchant._id,
      details: { eligible: evaluation.eligible }
    });

    return res.status(201).json({
      success: true,
      message:
        "Refund request received. Requesting a refund is not the same as a processed refund; an authorised admin must review and submit it.",
      refundRequest: {
        id: refundRequest._id,
        status: refundRequest.status,
        eligible: refundRequest.eligible,
        policyBasis: refundRequest.policyBasis,
        amountRequested: refundRequest.amountRequested
      }
    });
  } catch (error) {
    console.error("requestRefund error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to submit refund request" });
  }
};

const requestPlanChange = async (req, res) => {
  try {
    const { planCode, note } = req.body;

    if (!planCode) {
      return res.status(400).json({ success: false, message: "planCode is required" });
    }

    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const plan = await getPlanByCode(planCode);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Requested plan is not available" });
    }
    if (isContactOnly(plan)) {
      return res.status(400).json({
        success: false,
        code: "PLAN_CONTACT_ONLY",
        message: "Use the Enterprise quote request for custom pricing"
      });
    }

    const access = await resolveAccess(merchant._id);
    if (access.planCode === plan.code) {
      return res.status(409).json({ success: false, message: "You are already on this plan" });
    }

    const pending = await PlanChangeRequest.findOne({ merchant: merchant._id, status: "PENDING" });
    if (pending) {
      return res.status(409).json({ success: false, message: "A plan change request is already pending" });
    }

    const currentPlan = access.planCode ? await getPlanByCode(access.planCode) : null;
    const type = limitRank(plan) >= limitRank(currentPlan || { maximumLocations: 0 }) ? "UPGRADE" : "DOWNGRADE";

    const request = await PlanChangeRequest.create({
      merchant: merchant._id,
      type,
      currentPlanCode: access.planCode || "",
      requestedPlanCode: plan.code,
      note: String(note || "").slice(0, 2000)
    });

    await recordAudit(req, {
      action: "PLAN_CHANGE_REQUESTED",
      entityType: "PlanChangeRequest",
      entityId: request._id,
      merchant: merchant._id,
      details: { type, requestedPlanCode: plan.code }
    });

    return res.status(201).json({
      success: true,
      message:
        type === "UPGRADE"
          ? "Upgrade request recorded. Your new entitlements apply only after approval and payment."
          : "Plan change request recorded and awaiting review.",
      request: {
        id: request._id,
        type: request.type,
        status: request.status,
        requestedPlanCode: request.requestedPlanCode,
        requestedMaximumLocations: plan.maximumLocations,
        requestedUnlimitedLocations: plan.unlimitedLocations
      }
    });
  } catch (error) {
    console.error("requestPlanChange error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to submit plan change request" });
  }
};

const requestEnterpriseQuote = async (req, res) => {
  try {
    const { businessInfo, expectedLocations, note } = req.body || {};

    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const pending = await PlanChangeRequest.findOne({
      merchant: merchant._id,
      type: "ENTERPRISE_QUOTE",
      status: "PENDING"
    });
    if (pending) {
      return res.status(409).json({ success: false, message: "An Enterprise request is already pending" });
    }

    const access = await resolveAccess(merchant._id);

    const request = await PlanChangeRequest.create({
      merchant: merchant._id,
      type: "ENTERPRISE_QUOTE",
      currentPlanCode: access.planCode || "",
      requestedPlanCode: "ENTERPRISE",
      businessInfo: businessInfo && typeof businessInfo === "object" ? businessInfo : {},
      expectedLocations: expectedLocations === undefined || expectedLocations === null ? null : Number(expectedLocations),
      note: String(note || "").slice(0, 2000)
    });

    await recordAudit(req, {
      action: "ENTERPRISE_QUOTE_REQUESTED",
      entityType: "PlanChangeRequest",
      entityId: request._id,
      merchant: merchant._id
    });

    return res.status(201).json({
      success: true,
      message: "Enterprise request received. Our team will contact you with a quote.",
      request: { id: request._id, status: request.status, type: request.type }
    });
  } catch (error) {
    console.error("requestEnterpriseQuote error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to submit Enterprise request" });
  }
};

export {
  createCheckout,
  verifyCheckout,
  handleWebhook,
  cancelRenewal,
  requestRefund,
  requestPlanChange,
  requestEnterpriseQuote
};
