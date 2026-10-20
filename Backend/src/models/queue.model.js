import mongoose from "mongoose";

const queueSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true
    },

    serviceDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["OPEN", "PAUSED", "CLOSED"],
      default: "OPEN"
    },

    averageServiceMinutes: {
      type: Number,
      min: 1,
      default: 10
    },

    lastIssuedToken: {
      type: Number,
      default: 0
    },

    lastServedToken: {
      type: Number,
      default: 0
    },

    currentServingEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QueueEntry",
      default: null
    }
  },
  {
    timestamps: true
  }
);

queueSchema.index(
  { store: 1, serviceDate: 1 },
  { unique: true }
);

export default mongoose.model("Queue", queueSchema);