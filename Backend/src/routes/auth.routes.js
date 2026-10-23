import express from "express";
import {sendOtp, verifyOtp, adminLogin, getMe, logout} from "../controllers/auth.controller.js";
import {protect} from "../middleware/auth.middleware.js";
import { sendOtpLimiter, verifyOtpLimiter, adminLoginLimiter } from "../middleware/authRateLimit.js";

const router = express.Router();

router.post("/send-otp",sendOtpLimiter,sendOtp);
router.post("/verify-otp",verifyOtpLimiter,verifyOtp);
// The super admin console is the only email + password screen.
router.post("/admin-login",adminLoginLimiter,adminLogin);
router.get("/me",protect,getMe);
router.post("/logout",logout);

export default router;