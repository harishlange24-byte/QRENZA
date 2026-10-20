import mongoose from "mongoose";

// Covers upgrade/downgrade requests and Enterprise quote requests in one place.
const planChangeRequestSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["UPGRADE", "DOWNGRADE", "ENTERPRISE_QUOTE"],
      required: true
    },
    currentPlanCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true
    },
    requestedPlanCode: {
      type: String,
      default: "",
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"],
      default: "PENDING",
      index: true
    },
    // Enterprise inquiry details.
    businessInfo: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    expectedLocations: {
      type: Number,
      default: null,
      min: 0
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000
    },
    adminNote: {
      type: String,
      default: "",
      trim: true
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
    effectiveDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

planChangeRequestSchema.index({ merchant: 1, status: 1, createdAt: -1 });

export default mongoose.model("PlanChangeRequest", planChangeRequestSchema);
