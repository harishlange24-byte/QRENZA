import mongoose from "mongoose";

// One row per provider event so repeated/out-of-order webhooks stay idempotent.
const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      default: "RAZORPAY"
    },
    eventId: {
      type: String,
      required: true,
      trim: true
    },
    eventType: {
      type: String,
      default: ""
    },
    payloadHash: {
      type: String,
      default: ""
    },
    status: {
      type: String,
      enum: ["RECEIVED", "PROCESSED", "IGNORED", "FAILED"],
      default: "RECEIVED"
    },
    error: {
      type: String,
      default: ""
    },
    processedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

webhookEventSchema.index({ eventId: 1 }, { unique: true });

export default mongoose.model("WebhookEvent", webhookEventSchema);
