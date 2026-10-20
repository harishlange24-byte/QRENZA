import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
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

    sessionId: {
      type: String,
      index: true
    },

    eventType: {
      type: String,
      required: true,
      index: true
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    occurredAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

analyticsEventSchema.index({
  store: 1,
  occurredAt: -1
});

export default mongoose.model(
  "AnalyticsEvent",
  analyticsEventSchema
);