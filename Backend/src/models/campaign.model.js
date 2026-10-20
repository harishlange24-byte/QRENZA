import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    channel: {
      type: String,
      enum: ["WHATSAPP", "IN_APP"],
      default: "WHATSAPP"
    },

    audience: {
      segment: {
        type: String,
        enum: [
          "ALL_CUSTOMERS",
          "INACTIVE_CUSTOMERS",
          "FREQUENT_CUSTOMERS",
          "REWARD_HOLDERS"
        ],
        default: "ALL_CUSTOMERS"
      },

      inactiveDays: {
        type: Number,
        default: 0
      },

      minimumVisits: {
        type: Number,
        default: 0
      }
    },

    messageTemplate: {
      type: String,
      required: true
    },

    scheduledAt: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: [
        "DRAFT",
        "SCHEDULED",
        "RUNNING",
        "COMPLETED",
        "CANCELLED",
        "FAILED"
      ],
      default: "DRAFT",
      index: true
    },

    totalRecipients: {
      type: Number,
      default: 0
    },

    sentCount: {
      type: Number,
      default: 0
    },

    deliveredCount: {
      type: Number,
      default: 0
    },

    failedCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

campaignSchema.index({ store: 1, scheduledAt: 1 });

export default mongoose.model("Campaign", campaignSchema);