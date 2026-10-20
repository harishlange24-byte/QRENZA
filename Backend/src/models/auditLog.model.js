import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      default: null,
      index: true
    },

    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      default: null,
      index: true
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    action: {
      type: String,
      required: true,
      trim: true
    },

    entityType: {
      type: String,
      required: true
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },

    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    ipAddress: {
      type: String,
      default: ""
    },

    userAgent: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ store: 1, createdAt: -1 });

export default mongoose.model(
  "AuditLog",
  auditLogSchema
);