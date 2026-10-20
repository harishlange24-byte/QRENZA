import mongoose from "mongoose";

const loyaltyTransactionSchema = new mongoose.Schema(
    {
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
            index:true

        },
        store:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"LoyaltyCard",
            required:true
        },
        type:{
            type:String,
            enum:[
                "STAMP","REDEEM","ADJUSTMENT","EXPIRE","REVERSAL"
            ],
            required:true,
        },
        delta:{
            type:Number,
            required:true,
        },
        balanceAfter:{
              type:Number,
              required:true,
              min:0
        },
        performendBy:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            default:null
        },
        referenceType:{
            type:String,
            enum:["PURCHASE","REWARD","SCRATCH","MANUAL","SYSTEM"],
            default:"SYSTEM"
        },
        idempotencyKey:{
            type:String,
            sparse:true,
            unique:true,
        },
        note:{
            type:String,
            default:""
        }


    },
    {
        timestamps:true,
    }
);

loyaltyTransactionSchema.index({store:1,createdAt:-1});
loyaltyTransactionSchema.index({user:1,createdAt:-1});

export default mongoose.model("LoyaltyTransaction",loyaltyTransactionSchema);