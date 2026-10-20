import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import Plan from "../models/plan.model.js";
import { DEFAULT_PLANS } from "../config/plans.js";

// Creates or refreshes the plan catalogue. Safe to run repeatedly and it never
// touches existing subscriptions, so already sold prices stay untouched.
const seedPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const plan of DEFAULT_PLANS) {
      await Plan.findOneAndUpdate(
        { code: plan.code },
        { $set: plan, $setOnInsert: { version: 1 } },
        { upsert: true, returnDocument: "after", runValidators: true }
      );
      console.log(`Plan ready : ${plan.code}`);
    }

    console.log("==================================");
    console.log("QRENZA PLAN SEED COMPLETE");
    console.log("==================================");
  } catch (error) {
    console.error("Plan seed failed :", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedPlans();
