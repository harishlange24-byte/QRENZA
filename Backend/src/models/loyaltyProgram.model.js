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