import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema({

    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        required:true,
        index:true,
    },
    program:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"LoyaltyProgram",
        default:null
    },
    name:{
        type:String,
        required:true,
        trim:true,
        maxLength:150
    },
    description:{
        type:String,
        default:""
    },
    type:{
        type:String,
        enum:[
            "DISCOUNT",
            "FREE_ITEM",
            "COUPON",
            "CUSTOM"

        ],
        required:true
    },
    discountType:{
        type:String,
        enum:["PERCENTAGE","FIXED",null],
        default:null
    },
    value:{
        type:Number,
        min:0,
        default:0
    },
    probability:{
        type:Number,
        min:0,
        max:100,
        default:0
    },
    maxClaims:{
        type:Number,
        min:1,
        default:null
    },
    claimedCount:{
        type:Number,
        min:0,
        default:0
    },
    validityDays:{
        type:Number,
        min:1,
        default:30,
    },
    isActive:{
        type:Boolean,
        default:true,
    }

},
{
    timestamps:true
});
export default mongoose.model("Reward", rewardSchema);