import mongoose from "mongoose";
import { SUBSCRIPTION_STATUSES } from "../config/plans.js";

// planSnapshot keeps the price/limits/features that were sold, so a later
// catalogue price change never rewrites what an existing merchant bought.
const planSnapshotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    displayName: { type: String, default: "" },
    currency: { type: String, default: "INR" },
    billingInterval: { type: String, default: "YEARLY" },
    currentAnnualPrice: { type: Number, default: null },
    referenceAnnualPrice: { type: Number, default: null },
    maximumLocations: { type: Number, default: null },
    unlimitedLocations: { type: Boolean, default: false },
    features: { type: [String], default: [] },
    supportLevel: { type: String, default: "BASIC" }
  },
  { _id: false }
);

const subscriptionSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null
    },
    planCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    planSnapshot: {
      type: planSnapshotSchema,
      required: true
    },
    status: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "TRIALING",
      index: true
    },
    // Only one subscription per merchant may have isCurrent true.
    isCurrent: {
      type: Boolean,
      default: true,
      index: true
    },
    isTrial: {
      type: Boolean,
      default: false
    },
    trialUsed: {
      type: Boolean,
      default: false
    },
    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    billingInterval: { type: String, default: "YEARLY" },
    currency: { type: String, default: "INR" },
    agreedAnnualAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalPaidAmount: { type: Number, default: 0 },
    autoRenew: { type: Boolean, default: false },
    renewalStatus: {
      type: String,
      enum: ["NONE", "SCHEDULED", "PROCESSING", "FAILED"],
      default: "NONE"
    },
    paymentProvider: { type: String, default: "RAZORPAY" },
    providerSubscriptionId: { type: String, default: "" },
    latestPaymentId: { type: String, default: "" },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "" },
    pendingPlanCode: { type: String, default: "" },
    activatedBy: {
      type: String,
      enum: ["TRIAL", "PAYMENT", "ADMIN"],
      default: "TRIAL"
    }
  },
  { timestamps: true }
);

// Prevent duplicate current subscriptions for the same merchant, including
// under concurrent trial/payment requests.
subscriptionSchema.index(
  { merchant: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } }
);

subscriptionSchema.index({ merchant: 1, createdAt: -1 });

export default mongoose.model("Subscription", subscriptionSchema);
