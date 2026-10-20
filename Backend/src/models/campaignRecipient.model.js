import mongoose from "mongoose";

const campaignRecipientSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true
    },

    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "SENT",
        "DELIVERED",
        "READ",
        "FAILED"
      ],
      default: "PENDING",
      index: true
    },

    sentAt: {
      type: Date,
      default: null
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    readAt: {
      type: Date,
      default: null
    },

    failedReason: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

campaignRecipientSchema.index(
  { campaign: 1, user: 1 },
  { unique: true }
);

export default mongoose.model(
  "CampaignRecipient",
  campaignRecipientSchema
);