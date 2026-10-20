import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
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
      default: null,
      index: true
    },

    type: {
      type: String,
      enum: [
        "LOYALTY",
        "REWARD",
        "QUEUE",
        "FEEDBACK",
        "CAMPAIGN",
        "SYSTEM"
      ],
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    message: {
      type: String,
      required: true
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model(
  "Notification",
  notificationSchema
);