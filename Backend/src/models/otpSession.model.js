import mongoose from "mongoose";

const otpSessionSchema = new mongoose.Schema({

    phone:{
        type:String,
        required:true,
        trim:true,
        
    },
    otpHash:{
        type:String,
        required:true,
        select:false,
    },

    purpose:{
        type:String,
        enum:[
            "LOGIN",
            "REGISTER",
            "VERIFY_PHONE",
            "MERCHANY_LOGIN"
        ],
        default: "LOGIN",
       

    },
    channel:{
        type:String,
        enum:["WHATSAPP", "SMS"],
        default:"WHATSAPP"
    },

    attempts:{
        type:Number,
        default:0,
        min:0
    },

    maxAttempts:{
        type:Number,
        default:5,
        min:1
    },
    resendCount:{
        type:Number,
        default:0,
        min:0
    },
    verifiedAt:{
        type:Date,
        default:null
    },
    expiresAt:{
        type:Date,
        required:true,
       
    },
    consumedAt:{
           type:Date,
           default:null

    },
    requestIp:{
        type:String,
        default:""
    },
    userAgent:{
        type:String,
        default:""
    },
    lastSentAt:{
      type:Date,
      default:Date.now
    },


},{
    timestamps:true
});

otpSessionSchema.index({
    phone:1,
    purpose:1,
    createdAt:-1
})
otpSessionSchema.index(
    {expiresAt : 1},
    {expireAfterSeconds : 0}
);

export default mongoose.model("OtpSession", otpSessionSchema);