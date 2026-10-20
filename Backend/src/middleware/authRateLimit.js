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

export {sendOtpLimiter,verifyOtpLimiter}