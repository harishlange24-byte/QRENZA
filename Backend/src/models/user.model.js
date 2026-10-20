import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        trim:true,
        maxLength : 100
    },
    phone:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    email:{
        type:String,
        lowercase:true,
        trim:true,
        sparse:true,
    },
    passwordHash:{
        type:String,
        select:false,
    },
       
    role:{
       type:String,
       enum:["CUSTOMER","MERCHANT","STAFF","SUPER_ADMIN"],
       default:"CUSTOMER",
       index:true
    },
    isPhoneVerified:{
        type:Boolean,
        default:false,

    },
    isActive:{
        type:Boolean,
        default:true
    },
    lastLoginAt:Date
   },
   {
    timestamps:true
   }
);
const userModel  = new mongoose.model("User",userSchema);
export default userModel;
