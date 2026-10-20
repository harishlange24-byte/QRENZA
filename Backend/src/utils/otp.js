import crypto from "crypto";

const generateOpt = ()=>{
    return crypto.randomInt(100000,1000000).toString();
}

const hashOtp = (otp)=>{
    const secret = process.env.OTP_HASH;
    if(!secret){
        throw new Error("OTP_HASH is not configured");
    }

    return crypto
    .createHmac("sha256",secret)
    .update(otp)
    .digest("hex")
};

const verifyOtpHash = (otp,storedHash)=>{
    const incomingHash = Buffer.from(hashOtp(otp), "hex");
    const savedHash = Buffer.from(storedHash,"hex");

    return (
        incomingHash.length === savedHash.length &&
        crypto.timingSafeEqual(incomingHash,savedHash)
    );
};

const generateOtpExpiry = (minutes = 5)=>{

    return new Date(Date.now() + minutes * 60 * 1000);
};

export{
    generateOpt,
    hashOtp,
    generateOtpExpiry,
    verifyOtpHash
}