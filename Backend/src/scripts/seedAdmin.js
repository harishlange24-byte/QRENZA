import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import User from "../models/user.model.js";

// Creates the platform operator account, or promotes an existing phone number
// to SUPER_ADMIN. The email and password set here are what the admin console
// signs in with; every other screen still uses the phone OTP. Safe to run
// repeatedly and it never prints the raw password into the database logs.
const seedAdmin = async () => {
  try {
    const phone = String(process.env.SUPER_ADMIN_PHONE || "").trim();
    if (!phone) {
      throw new Error("SUPER_ADMIN_PHONE is required");
    }
    const name = String(process.env.SUPER_ADMIN_NAME || "").trim();
    const email = String(process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
    const password = String(process.env.SUPER_ADMIN_PASSWORD || "");

    await mongoose.connect(process.env.MONGO_URI);

    let user = await User.findOne({ phone });
    let action;

    if (user) {
      user.role = "SUPER_ADMIN";
      user.isActive = true;
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

    if (email) user.email = email;
    if (password) user.passwordHash = await bcrypt.hash(password, 10);

    await user.save();

    console.log("==================================");
    console.log("QRENZA ADMIN SEED COMPLETE");
    console.log(action);
    console.log(`Phone : ${user.phone}`);
    console.log(`Role  : ${user.role}`);
    console.log(`Email : ${user.email || "(not set)"}`);
    console.log(`Password set : ${user.passwordHash ? "yes" : "no"}`);
    console.log("==================================");
  } catch (error) {
    console.error("Admin seed failed :", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedAdmin();
