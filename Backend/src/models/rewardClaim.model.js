import mongoose from "mongoose";

const rewardClaimSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: true
    },

    source: {
      type: String,
      enum: [
        "LOYALTY_MILESTONE",
        "SCRATCH",
        "MANUAL",
        "CAMPAIGN"
      ],
      required: true
    },

    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REDEEMED", "EXPIRED", "CANCELLED"],
      default: "ACTIVE",
      index: true
    },

    claimedAt: {
      type: Date,
      default: Date.now
    },

    redeemedAt: {
      type: Date,
      default: null
    },

    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

rewardClaimSchema.index({ user: 1, store: 1, status: 1 });

export default mongoose.model("RewardClaim", rewardClaimSchema);