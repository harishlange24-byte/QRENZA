import mongoose from "mongoose";

const loyaltyProgramSchema = new mongoose.Schema(
    {
        store:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Store",
            required:true,
            unique:true,
        },
        name:{
            type:String,
            required:true,
            trim:true,
        },
        stampsRequired:{
            type:Number,
            required:true,
            min:1,
            default:10,
        },
        // Plain text the counter reads out. "10 stamps and you get a free chai"
        // keeps the reward visible without opening the rewards screen.
        rewardText:{
            type:String,
            trim:true,
            default:"",
        },
        stampRule:{
            type:String,
            enum:["ONE_PER_VISIT","ONE_PER_PURCHASE"],
            default:"ONE_PER_PURCHASE"
        },
        isActive:{
            type:Boolean,
            default:true
        }

    },{
        timestamps:true
    }
)

export default mongoose.model("LoyaltyProgram",loyaltyProgramSchema);