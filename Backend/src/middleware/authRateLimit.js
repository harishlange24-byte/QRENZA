import rateLimit from "express-rate-limit";

const sendOtpLimiter = rateLimit({
    windowMs : 15 * 60 * 1000,
    limit : 10,
    standardHeaders:true,
    legacyHeaders:false,
    message : {
        success:false,
        message:"Too many OTP requests. Please try again later."
    }

})

const verifyOtpLimiter = rateLimit({
    windowMs : 15 * 60 * 1000,
    limit : 10,
    standardHeaders : true,
    legacyHeaders : false,
    message : {
        success : false,
        message : "Too many verification attempts. Please try again later."
    }
})

// Password guessing on the super admin screen is blocked the same way OTP
// requests are, so the endpoint cannot be used to brute force a login.
const adminLoginLimiter = rateLimit({
    windowMs : 15 * 60 * 1000,
    limit : 10,
    standardHeaders : true,
    legacyHeaders : false,
    message : {
        success : false,
        message : "Too many login attempts. Please try again later."
    }
})

export {sendOtpLimiter,verifyOtpLimiter,adminLoginLimiter}