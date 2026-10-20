import Plan from "../models/plan.model.js";
import Subscription from "../models/subscription.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import PlanChangeRequest from "../models/planChangeRequest.model.js";
import RefundRequest from "../models/refundRequest.model.js";
import AuditLog from "../models/auditLog.model.js";

import * as razorpay from "../services/razorpay.service.js";
import { PLAN_FEATURES, DEFAULT_PLANS } from "../config/plans.js";
import { toPublicPlan } from "../services/pricing.service.js";
import { buildPlanSnapshot } from "../services/entitlement.service.js";
import { recordAudit } from "../utils/audit.js";

const EDITABLE_PLAN_FIELDS = [
  "displayName",
  "description",
  "currency",
  "billingInterval",
  "currentAnnualPrice",
  "referenceAnnualPrice",
  "maximumLocations",
  "unlimitedLocations",
  "features",
  "supportLevel",
  "isContactOnly",
  "isActive",
  "offerStart",
  "offerEnd",
  "sortOrder"
];

const listPlansAdmin = async (req, res) => {
  try {
    const plans = await Plan.find({}).sort({ sortOrder: 1 });
    return res.status(200).json({
      success: true,
      plans: plans.map((plan) => ({ ...toPublicPlan(plan), isActive: plan.isActive, version: plan.version, offerStart: plan.offerStart, offerEnd: plan.offerEnd })),
      featureCatalogue: PLAN_FEATURES,
      seedDefaults: DEFAULT_PLANS.map((plan) => plan.code)
    });
  } catch (error) {
    console.error("listPlansAdmin error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load plan catalogue" });
  }
};

const createPlan = async (req, res) => {
  try {
    const { code, displayName } = req.body || {};
    if (!code || !displayName) {
      return res.status(400).json({ success: false, message: "code and displayName are required" });
    }

    const existing = await Plan.findOne({ code: String(code).toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A plan with this code already exists" });
    }

    const payload = { code: String(code).toUpperCase().trim(), displayName };
    EDITABLE_PLAN_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined && field !== "isActive") payload[field] = req.body[field];
    });

    const plan = await Plan.create(payload);

    await recordAudit(req, {
      action: "PLAN_CREATED",
      entityType: "Plan",
      entityId: plan._id,
      details: { code: plan.code }
    });

    return res.status(201).json({ success: true, message: "Plan created", plan: toPublicPlan(plan) });
  } catch (error) {
    console.error("createPlan error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to create plan" });
  }
};

// Catalogue changes never rewrite what existing subscribers already paid for,
// because each subscription keeps its own planSnapshot.
const updatePlan = async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase().trim();
    const plan = await Plan.findOne({ code });
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const changes = {};
    EDITABLE_PLAN_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) changes[field] = req.body[field];
    });

    if (!Object.keys(changes).length) {
      return res.status(400).json({ success: false, message: "No valid fields to update" });
    }

    ["currentAnnualPrice", "referenceAnnualPrice", "maximumLocations", "sortOrder"].forEach((field) => {
      if (changes[field] !== undefined && changes[field] !== null) changes[field] = Number(changes[field]);
    });

    Object.assign(plan, changes);
    plan.version = (plan.version || 1) + 1;
    await plan.save();

    await recordAudit(req, {
      action: "PLAN_UPDATED",
      entityType: "Plan",
      entityId: plan._id,
      details: { code: plan.code, changes }
    });

    return res.status(200).json({ success: true, message: "Plan updated", plan: toPublicPlan(plan) });
  } catch (error) {
    console.error("updatePlan error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to update plan" });
  }
};

const listSubscriptions = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = String(req.query.status).toUpperCase();
    if (req.query.merchant) query.merchant = req.query.merchant;

    const subscriptions = await Subscription.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("merchant", "businessName contactEmail status");

    return res.status(200).json({ success: true, subscriptions });
  } catch (error) {
    console.error("listSubscriptions error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load subscriptions" });
  }
};

// Explicit authorised admin action. This is the only way a plan becomes active
// without a verified payment, and it is fully audited.
const adminActivateSubscription = async (req, res) => {
  try {
    const { subscriptionId, planCode, periods } = req.body || {};

    if (!subscriptionId || !planCode) {
      return res.status(400).json({ success: false, message: "subscriptionId and planCode are required" });
    }

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ success: false, message: "Subscription not found" });
    }

    const plan = await Plan.findOne({ code: String(planCode).toUpperCase().trim() });
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" });
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + Math.max(1, Number(periods) || 1));

    subscription.plan = plan._id;
    subscription.planCode = plan.code;
    subscription.planSnapshot = buildPlanSnapshot(plan);
    subscription.status = "ACTIVE";
    subscription.isTrial = false;
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = periodEnd;
    subscription.agreedAnnualAmount = plan.currentAnnualPrice ?? 0;
    subscription.cancelAtPeriodEnd = false;
    subscription.cancelledAt = null;
    subscription.cancellationReason = "";
    subscription.activatedBy = "ADMIN";
    await subscription.save();

    await recordAudit(req, {
      action: "SUBSCRIPTION_ACTIVATED_BY_ADMIN",
      entityType: "Subscription",
      entityId: subscription._id,
      merchant: subscription.merchant,
      details: { planCode: plan.code, periods: Number(periods) || 1 }
    });

    return res.status(200).json({ success: true, message: "Subscription activated by admin", subscription });
  } catch (error) {
    console.error("adminActivateSubscription error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to activate subscription" });
  }
};

const listPayments = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = String(req.query.status).toUpperCase();

    const payments = await PaymentTransaction.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("-providerSignature")
      .populate("merchant", "businessName contactEmail");

    return res.status(200).json({ success: true, payments });
  } catch (error) {
    console.error("listPayments error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load payments" });
  }
};

const listRefunds = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = String(req.query.status).toUpperCase();

    const refunds = await RefundRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("merchant", "businessName contactEmail");

    return res.status(200).json({ success: true, refunds });
  } catch (error) {
    console.error("listRefunds error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load refund requests" });
  }
};

const reviewRefund = async (req, res) => {
  try {
    const { status, adminNote } = req.body || {};
    const nextStatus = String(status || "").toUpperCase();

    if (!["APPROVED", "REJECTED"].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "status must be APPROVED or REJECTED" });
    }

    const refund = await RefundRequest.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ success: false, message: "Refund request not found" });
    }
    if (["PROCESSED", "REJECTED"].includes(refund.status)) {
      return res.status(409).json({ success: false, message: `Refund request is already ${refund.status}` });
    }

    refund.status = nextStatus;
    refund.adminNote = String(adminNote || "").slice(0, 1000);
    refund.reviewedBy = req.user._id;
    refund.reviewedAt = new Date();
    await refund.save();

    await recordAudit(req, {
      action: `REFUND_${nextStatus}`,
      entityType: "RefundRequest",
      entityId: refund._id,
      merchant: refund.merchant,
      details: { adminNote: refund.adminNote }
    });

    return res.status(200).json({
      success: true,
      message: `Refund request ${nextStatus.toLowerCase()}. Approval alone does not move money.`,
      refund
    });
  } catch (error) {
    console.error("reviewRefund error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to review refund request" });
  }
};

// Only this explicit action talks to the provider. It never happens because a
// merchant clicked a button.
const submitRefund = async (req, res) => {
  try {
    const refund = await RefundRequest.findById(req.params.id);
    if (!refund) {
      return res.status(404).json({ success: false, message: "Refund request not found" });
    }
    if (refund.status !== "APPROVED") {
      return res.status(409).json({ success: false, message: "Only an approved refund can be submitted" });
    }
    if (!refund.providerPaymentId) {
      return res.status(400).json({ success: false, message: "No provider payment id on this refund request" });
    }
    if (!razorpay.isConfigured()) {
      return res.status(503).json({
        success: false,
        code: "RAZORPAY_NOT_CONFIGURED",
        message: "Razorpay is not configured. Nothing was refunded."
      });
    }

    let providerRefund;
    try {
      providerRefund = await razorpay.createRefund({
        paymentId: refund.providerPaymentId,
        amount: refund.amountRequested,
        notes: { refundRequestId: String(refund._id) }
      });
    } catch (error) {
      await recordAudit(req, {
        action: "REFUND_SUBMIT_FAILED",
        entityType: "RefundRequest",
        entityId: refund._id,
        merchant: refund.merchant,
        details: { message: error.message }
      });
      return res.status(502).json({ success: false, message: "Provider refund failed. Nothing was refunded." });
    }

    refund.status = "PROCESSED";
    refund.processedAt = new Date();
    refund.providerRefundId = providerRefund?.id || "";
    await refund.save();

    await PaymentTransaction.updateOne(
      { _id: refund.payment },
      {
        $inc: { refundAmount: refund.amountRequested },
        $set: { refundedAt: new Date(), status: "REFUNDED" }
      }
    );

    await recordAudit(req, {
      action: "REFUND_SUBMITTED",
      entityType: "RefundRequest",
      entityId: refund._id,
      merchant: refund.merchant,
      details: { providerRefundId: refund.providerRefundId, amount: refund.amountRequested }
    });

    return res.status(200).json({ success: true, message: "Refund submitted to the provider", refund });
  } catch (error) {
    console.error("submitRefund error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to submit refund" });
  }
};

const listPlanChanges = async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = String(req.query.status).toUpperCase();
    if (req.query.type) query.type = String(req.query.type).toUpperCase();

    const changes = await PlanChangeRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("merchant", "businessName contactEmail");

    return res.status(200).json({ success: true, changes });
  } catch (error) {
    console.error("listPlanChanges error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load plan change requests" });
  }
};

const reviewPlanChange = async (req, res) => {
  try {
    const { status, adminNote } = req.body || {};
    const nextStatus = String(status || "").toUpperCase();

    if (!["APPROVED", "REJECTED", "COMPLETED"].includes(nextStatus)) {
      return res.status(400).json({ success: false, message: "status must be APPROVED, REJECTED or COMPLETED" });
    }

    const request = await PlanChangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Plan change request not found" });
    }

    request.status = nextStatus;
    request.adminNote = String(adminNote || "").slice(0, 1000);
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    if (nextStatus === "APPROVED" || nextStatus === "COMPLETED") request.effectiveDate = new Date();
    await request.save();

    await recordAudit(req, {
      action: `PLAN_CHANGE_${nextStatus}`,
      entityType: "PlanChangeRequest",
      entityId: request._id,
      merchant: request.merchant,
      details: { requestedPlanCode: request.requestedPlanCode }
    });

    return res.status(200).json({
      success: true,
      message:
        nextStatus === "APPROVED"
          ? "Request approved. The merchant still needs to complete payment before new entitlements apply."
          : `Plan change request ${nextStatus.toLowerCase()}.`,
      request
    });
  } catch (error) {
    console.error("reviewPlanChange error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to review plan change request" });
  }
};

const listAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({ entityType: { $in: ["Plan", "Subscription", "PaymentTransaction", "RefundRequest", "PlanChangeRequest"] } })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error("listAuditLogs error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load audit logs" });
  }
};

export {
  listPlansAdmin,
  createPlan,
  updatePlan,
  listSubscriptions,
  adminActivateSubscription,
  listPayments,
  listRefunds,
  reviewRefund,
  submitRefund,
  listPlanChanges,
  reviewPlanChange,
  listAuditLogs
};
