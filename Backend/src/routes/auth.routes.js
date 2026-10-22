import express from "express";
import {sendOtp, verifyOtp, getMe, logout} from "../controllers/auth.controller.js";
import {protect} from "../middleware/auth.middleware.js";
import { sendOtpLimiter, verifyOtpLimiter } from "../middleware/authRateLimit.js";

const router = express.Router();

router.post("/send-otp",sendOtpLimiter,sendOtp);
router.post("/verify-otp",verifyOtpLimiter,verifyOtp);
router.get("/me",protect,getMe);
router.post("/logout",logout);

export default router;