import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    rewardClaim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RewardClaim",
      default: null
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true
    },

    value: {
      type: Number,
      required: true,
      min: 0
    },

    minOrderValue: {
      type: Number,
      min: 0,
      default: 0
    },

    maxDiscount: {
      type: Number,
      min: 0,
      default: null
    },

    validFrom: {
      type: Date,
      required: true
    },

    validUntil: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "USED", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
      index: true
    },

    usageCount: {
      type: Number,
      default: 0
    },

    maxUsage: {
      type: Number,
      min: 1,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

couponSchema.index({ store: 1, status: 1, validUntil: 1 });

export default mongoose.model("Coupon", couponSchema);