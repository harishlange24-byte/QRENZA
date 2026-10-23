import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import OtpSession from "../models/otpSession.model.js";
import User from "../models/user.model.js";
import { generateOpt, generateOtpExpiry, hashOtp, verifyOtpHash } from "../utils/otp.js";
import { sendTextBeeSms } from "../utils/sendSms.js";

const OTP_TTL_MINUTES = 5;
const OTP_COOLDOWN_MS = 5 * 1000;
const OTP_WINDOW_MINUTES = 15;
const OTP_MAX_PER_WINDOW = 5;

// The app and the API normally sit on different hosts, so the session cookie has
// to travel cross-site. Browsers only allow that with SameSite=None, and None is
// ignored unless the cookie is marked Secure. Both are read off the connection
// itself, so plain http dev keeps Lax instead of having its cookie thrown away.
const sessionCookie = (req) => {
    const forwarded = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const https = req.secure || forwarded === "https";

    return {
        httpOnly: true,
        secure: https,
        sameSite: https ? "none" : "lax",
        path: "/"
    };
};

const sendOtp = async (req, res) => {
    try {
        const phone = req.body.phone;

        if (!phone || typeof phone !== "string") {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        const latestSession = await OtpSession.findOne({
            phone,
            purpose: "LOGIN"
        }).sort({ createdAt: -1 });

        if (latestSession) {
            const elapsedMs = Date.now() - latestSession.createdAt.getTime();

            if (elapsedMs < OTP_COOLDOWN_MS) {
                const retryAfterSecond = Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000);

                return res.status(429).json({
                    success: false,
                    message: `Wait for ${retryAfterSecond} before requesting another OTP.`,
                    retryAfterSecond
                });
            }
        }

        const windowStart = new Date(Date.now() - OTP_WINDOW_MINUTES * 60 * 1000);

        const recentRequests = await OtpSession.countDocuments({
            phone,
            purpose: "LOGIN",
            createdAt: { $gte: windowStart }
        });

        if (recentRequests >= OTP_MAX_PER_WINDOW) {
            return res.status(429).json({
                success: false,
                message: "Too many OTP requests. Please try again later.",
                retryAfterSecond: OTP_WINDOW_MINUTES * 60
            });
        }

        const otp = generateOpt();

        const otpSession = await OtpSession.create({
            phone,
            otpHash: hashOtp(otp),
            purpose: "LOGIN",
            expiresAt: generateOtpExpiry(OTP_TTL_MINUTES)
        });

        try {
            await sendTextBeeSms(phone, `Your Qrenza OTP is ${otp}. Valid for 5 minutes. Do not share it.`);
        } catch (error) {
            console.error("SMS sending failed :", error.message);

            // The code was never delivered, so drop the session and let the
            // caller retry instead of leaving a dead OTP behind.
            await OtpSession.findByIdAndDelete(otpSession._id);

            return res.status(502).json({
                success: false,
                message: "Unable to send OTP SMS. Please try again."
            });
        }

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully"
        });
    } catch (error) {
        console.error("sendOtp error : ", error.message);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (typeof phone !== "string" || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
            return res.status(400).json({
                success: false,
                message: "Valid phone and 6-digit OTP required"
            });
        }

        const session = await OtpSession.findOne({
            phone,
            purpose: "LOGIN",
            consumedAt: null
        }).sort({ createdAt: -1 }).select("+otpHash");

        if (!session) {
            return res.status(400).json({
                success: false,
                message: "OTP session not found"
            });
        }

        if (session.expiresAt <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "OTP has expired"
            });
        }

        if (session.attempts >= session.maxAttempts) {
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Request a new OTP."
            });
        }

        if (!verifyOtpHash(otp, session.otpHash)) {
            session.attempts += 1;

            if (session.attempts >= session.maxAttempts) {
                session.consumedAt = new Date();
            }

            await session.save();

            return res.status(400).json({
                success: false,
                message: "Incorrect OTP"
            });
        }

        const now = new Date();

        // Guarded update so two parallel verifies cannot both burn the session.
        const consumedSession = await OtpSession.findOneAndUpdate(
            {
                _id: session._id,
                consumedAt: null,
                expiresAt: { $gt: now },
                attempts: { $lt: session.maxAttempts }
            },
            {
                $set: {
                    verifiedAt: now,
                    consumedAt: now
                }
            },
            { new: true }
        );

        if (!consumedSession) {
            return res.status(400).json({
                success: false,
                message: "OTP expired or already used"
            });
        }

        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({
                phone,
                role: "CUSTOMER",
                isPhoneVerified: true,
                lastLoginAt: now
            });
        } else {
            if (!user.isActive) {
                return res.status(403).json({
                    success: false,
                    message: "Account is inactive"
                });
            }

            user.isPhoneVerified = true;
            user.lastLoginAt = now;

            await user.save();
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        const token = jwt.sign(
            { sub: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            ...sessionCookie(req),
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        console.error("verifyOtp error : ", error.message);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

// The platform console is the one screen that does not use OTP. It signs in
// with an email and a password that only exist for SUPER_ADMIN accounts, so a
// customer or merchant number can never open it.
const adminLogin = async (req, res) => {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await User.findOne({
            email,
            role: "SUPER_ADMIN"
        }).select("+passwordHash");

        // An unknown email and a wrong password answer the same way, so the
        // screen never confirms which admin addresses exist.
        if (!user || !user.passwordHash) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Account is inactive"
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = jwt.sign(
            { sub: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            ...sessionCookie(req),
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user._id,
                phone: user.phone,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("adminLogin error : ", error.message);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};

const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: {
            id: req.user._id,
            phone: req.user.phone,
            email: req.user.email,
            role: req.user.role
        }
    });
};

const logout = async (req, res) => {
    // Clearing only works when the attributes match the ones the cookie was set
    // with, so the same options are derived again here.
    res.clearCookie("token", sessionCookie(req));

    return res.status(200).json({
        success: true,
        message: "Logged out"
    });
};

export { sendOtp, verifyOtp, adminLogin, getMe, logout };
