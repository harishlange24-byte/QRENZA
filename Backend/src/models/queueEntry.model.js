import mongoose from "mongoose";

const queueEntrySchema = new mongoose.Schema(
  {
    queue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Queue",
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
      default: null,
      index: true
    },

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true
    },

    tokenNumber: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [
        "WAITING",
        "CALLED",
        "SERVING",
        "SERVED",
        "SKIPPED",
        "CANCELLED"
      ],
      default: "WAITING",
      index: true
    },

    positionAtJoin: {
      type: Number,
      min: 1
    },

    estimatedWaitMinutes: {
      type: Number,
      min: 0,
      default: 0
    },

    joinedAt: {
      type: Date,
      default: Date.now
    },

    calledAt: {
      type: Date,
      default: null
    },

    servedAt: {
      type: Date,
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

queueEntrySchema.index(
  { queue: 1, tokenNumber: 1 },
  { unique: true }
);

queueEntrySchema.index({ store: 1, status: 1 });

export default mongoose.model("QueueEntry", queueEntrySchema);