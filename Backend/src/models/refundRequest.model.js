import mongoose from "mongoose";

const refundRequestSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransaction",
      required: true,
      index: true
    },
    providerPaymentId: {
      type: String,
      default: "",
      trim: true
    },
    amountRequested: {
      type: Number,
      required: true,
      min: 0
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000
    },
    details: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000
    },
    // Policy evaluation result calculated on the server.
    eligible: {
      type: Boolean,
      default: false
    },
    policyBasis: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "PROCESSED"],
      default: "PENDING",
      index: true
    },
    adminNote: {
      type: String,
      default: ""
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    processedAt: {
      type: Date,
      default: null
    },
    providerRefundId: {
      type: String,
      default: ""
    }
  },
  { timestamps: true }
);

refundRequestSchema.index({ payment: 1, status: 1 });

export default mongoose.model("RefundRequest", refundRequestSchema);
