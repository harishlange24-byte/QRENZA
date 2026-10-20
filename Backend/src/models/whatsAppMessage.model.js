import mongoose from "mongoose";

const whatsappMessageSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },

    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      default: null
    },

    recipientPhone: {
      type: String,
      required: true,
      trim: true
    },

    direction: {
      type: String,
      enum: ["OUTBOUND", "INBOUND"],
      default: "OUTBOUND"
    },

    type: {
      type: String,
      enum: [
        "OTP",
        "MARKETING",
        "TRANSACTIONAL"
      ],
      required: true
    },

    templateName: {
      type: String,
      default: ""
    },

    content: {
      type: String,
      default: ""
    },

    providerMessageId: {
      type: String,
      sparse: true,
      unique: true
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

    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,

    errorCode: {
      type: String,
      default: ""
    },

    errorMessage: {
      type: String,
      default: ""
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

whatsappMessageSchema.index({ store: 1, createdAt: -1 });

export default mongoose.model(
  "WhatsAppMessage",
  whatsappMessageSchema
);