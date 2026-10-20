import Plan from "../models/plan.model.js";
import Subscription from "../models/subscription.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import Merchant from "../models/merchant.model.js";

import { DEFAULT_PLANS, FEATURE_LABELS, FEATURE_ORDER } from "../config/plans.js";
import { toPublicPlan, publicPricingConfig } from "../services/pricing.service.js";
import { resolveAccess, startTrial, findMerchantForUser } from "../services/entitlement.service.js";

// Public plan catalogue used by the pricing page and the comparison table.
const listPlans = async (req, res) => {
  try {
    const now = new Date();
    let plans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 });

    // Fallback so the public page still renders before the first seed.
    if (!plans.length) plans = DEFAULT_PLANS;

    return res.status(200).json({
      success: true,
      plans: plans.map((plan) => toPublicPlan(plan, now)),
      featureLabels: FEATURE_LABELS,
      featureOrder: FEATURE_ORDER,
      billing: publicPricingConfig()
    });
  } catch (error) {
    console.error("listPlans error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load plans" });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const access = await resolveAccess(merchant._id);

    return res.status(200).json({
      success: true,
      access,
      billing: publicPricingConfig()
    });
  } catch (error) {
    console.error("getMySubscription error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load subscription" });
  }
};

const startTrialHandler = async (req, res) => {
  try {
    const { planCode } = req.body;

    if (!planCode || typeof planCode !== "string") {
      return res.status(400).json({ success: false, message: "planCode is required" });
    }

    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const result = await startTrial(merchant._id, planCode);

    if (!result.ok) {
      const status =
        result.code === "PLAN_NOT_FOUND" ? 404 : result.code === "PLAN_CONTACT_ONLY" ? 400 : 409;
      return res.status(status).json({
        success: false,
        code: result.code,
        message: result.message
      });
    }

    const access = await resolveAccess(merchant._id);

    return res.status(201).json({
      success: true,
      code: result.code,
      message: result.message,
      access
    });
  } catch (error) {
    console.error("startTrialHandler error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to start trial" });
  }
};

const getSubscriptionHistory = async (req, res) => {
  try {
    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const subscriptions = await Subscription.find({ merchant: merchant._id })
      .sort({ createdAt: -1 })
      .lean();

    const payments = await PaymentTransaction.find({ merchant: merchant._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription._id,
        planCode: subscription.planCode,
        planName: subscription.planSnapshot?.displayName || subscription.planCode,
        status: subscription.status,
        isTrial: subscription.isTrial,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        agreedAnnualAmount: subscription.agreedAnnualAmount,
        totalPaidAmount: subscription.totalPaidAmount,
        currency: subscription.currency,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        createdAt: subscription.createdAt
      })),
      payments: payments.map((payment) => ({
        id: payment._id,
        planCode: payment.planCode,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        providerOrderId: payment.providerOrderId,
        providerPaymentId: payment.providerPaymentId,
        refundAmount: payment.refundAmount,
        verifiedAt: payment.verifiedAt,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt
      }))
    });
  } catch (error) {
    console.error("getSubscriptionHistory error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load billing history" });
  }
};

const getLimits = async (req, res) => {
  try {
    const merchant = await findMerchantForUser(req.user._id);
    if (!merchant) {
      return res.status(404).json({ success: false, message: "Merchant account not found" });
    }

    const access = await resolveAccess(merchant._id);

    return res.status(200).json({ success: true, access });
  } catch (error) {
    console.error("getLimits error : ", error.message);
    return res.status(500).json({ success: false, message: "Unable to load plan limits" });
  }
};

export { listPlans, getMySubscription, startTrialHandler, getSubscriptionHistory, getLimits };
