import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    currency: {
      type: String,
      default: "INR"
    },
    billingInterval: {
      type: String,
      enum: ["YEARLY"],
      default: "YEARLY"
    },
    // Integer paise. null means the price is set through an authorised admin
    // process (Enterprise) instead of the public catalogue.
    currentAnnualPrice: {
      type: Number,
      default: null,
      min: 0
    },
    referenceAnnualPrice: {
      type: Number,
      default: null,
      min: 0
    },
    // null together with unlimitedLocations true means "no limit".
    maximumLocations: {
      type: Number,
      default: null,
      min: 0
    },
    unlimitedLocations: {
      type: Boolean,
      default: false
    },
    features: {
      type: [String],
      default: []
    },
    supportLevel: {
      type: String,
      enum: ["BASIC", "PRIORITY", "DEDICATED", "CUSTOM"],
      default: "BASIC"
    },
    // true for plans that only accept a quote request (Enterprise).
    isContactOnly: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    offerStart: {
      type: Date,
      default: null
    },
    offerEnd: {
      type: Date,
      default: null
    },
    sortOrder: {
      type: Number,
      default: 0
    },
    version: {
      type: Number,
      default: 1
    }
  },
  { timestamps: true }
);

planSchema.index({ isActive: 1, sortOrder: 1 });

export default mongoose.model("Plan", planSchema);
