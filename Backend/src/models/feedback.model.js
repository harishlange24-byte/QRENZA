import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
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

    comment: {
      type: String,
      trim: true,
      maxlength: 2000
    },

    source: {
      type: String,
      enum: [
        "POST_VISIT",
        "LOYALTY",
        "QUEUE",
        "MENU",
        "MANUAL"
      ],
      default: "POST_VISIT"
    },

    status: {
      type: String,
      enum: ["NEW", "ACKNOWLEDGED", "RESOLVED"],
      default: "NEW",
      index: true
    }
  },
  {
    timestamps: true
  }
);

feedbackSchema.index({ store: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);