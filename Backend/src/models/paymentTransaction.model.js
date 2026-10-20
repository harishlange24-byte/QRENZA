import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true
    },
    planCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    purpose: {
      type: String,
      enum: ["SUBSCRIPTION", "RENEWAL"],
      default: "SUBSCRIPTION"
    },
    paymentProvider: {
      type: String,
      default: "RAZORPAY"
    },
    // No default here on purpose. These fields back unique sparse indexes, so
    // they must stay absent until the provider actually gives us a value.
    // A default of "" would make every unset document collide on the index.
    providerOrderId: { type: String, trim: true },
    providerPaymentId: { type: String, trim: true },
    providerSignature: { type: String, default: "", select: false },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: ["CREATED", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"],
      default: "CREATED",
      index: true
    },
    // Safe failure text only. Never store card data or provider secrets.
    failureReason: { type: String, default: "" },
    idempotencyKey: { type: String, default: "", trim: true },
    webhookEventIds: { type: [String], default: [] },
    verifiedAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0 },
    refundedAt: { type: Date, default: null },
    notes: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ providerOrderId: 1 }, { unique: true, sparse: true });
paymentTransactionSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true });
paymentTransactionSchema.index({ merchant: 1, createdAt: -1 });

export default mongoose.model("PaymentTransaction", paymentTransactionSchema);
