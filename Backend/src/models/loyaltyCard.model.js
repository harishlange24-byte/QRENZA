import mongoose from "mongoose";

const loyaltyCardSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        required:true,
        index:true,
    },
    program:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"LoyaltyProgram",
        required:true,
    },
    stamps:{
        type:Number,
        min:0,
        default:0
    },
    totalStampsEarned:{
        type:Number,
        min:0,
        default:0,
    },

    totalRewardsEarned:{
        type:Number,
        min:0,
        default:0
    },
    status:{
        type:String,
        enum:["ACTIVE","BLOCKED"],
        default:"ACTIVE"
    }

},{
    timestamps:true
}
);

loyaltyCardSchema.index(
    {user:1,store:1},{unique:true}
)

export default  mongoose.model("LoyaltyCard",loyaltyCardSchema);