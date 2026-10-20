import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    feedback: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feedback",
      required: true,
      unique: true
    },

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

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },

    category: {
      type: String,
      enum: [
        "PRODUCT",
        "SERVICE",
        "STAFF",
        "WAIT_TIME",
        "PRICE",
        "CLEANLINESS",
        "OTHER"
      ],
      default: "OTHER"
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
      index: true
    },

    status: {
      type: String,
      enum: [
        "OPEN",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED"
      ],
      default: "OPEN",
      index: true
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null
    },

    resolutionNote: {
      type: String,
      default: ""
    },

    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

issueSchema.index({ store: 1, status: 1, createdAt: -1 });

export default mongoose.model("Issue", issueSchema);