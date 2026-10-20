import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import User from "../models/user.model.js";

// Creates the platform operator account, or promotes an existing phone number
// to SUPER_ADMIN. Safe to run repeatedly and it never prints any secret.
const seedAdmin = async () => {
  try {
    const phone = String(process.env.SUPER_ADMIN_PHONE || "").trim();
    if (!phone) {
      throw new Error("SUPER_ADMIN_PHONE is required");
    }
    const name = String(process.env.SUPER_ADMIN_NAME || "").trim();

    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ phone });
    let action;

    if (user) {
      user.role = "SUPER_ADMIN";
      user.isActive = true;
      await user.save();
      action = "Promoted existing user";
    } else {
      user = await User.create({
        name: name || "Platform Admin",
        phone,
        role: "SUPER_ADMIN",
        isPhoneVerified: true,
        isActive: true
      });
      action = "Created new admin user";
    }

    console.log("==================================");
    console.log("QRENZA ADMIN SEED COMPLETE");
    console.log(action);
    console.log(`Phone : ${user.phone}`);
    console.log(`Role  : ${user.role}`);
    console.log("==================================");
  } catch (error) {
    console.error("Admin seed failed :", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
