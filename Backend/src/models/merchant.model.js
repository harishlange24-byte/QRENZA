import mongoose from "mongoose";

const merchantSchema = new mongoose.Schema({

    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        unique:true
    },
    businessName:{
        type:String,
        required:true,
        trim:true,
        maxLength:100
    },

    businessType:{
        type:String,
        enum:["RESTAURANT","GROCERY","PHARMACY","CLOTHING","ELECTRONICS","SALON","BAKERY","RETAIL","CAFE","OTHER"],
        default:"OTHER",
    },
    logo:{
        type:String,
        default:""
    },
    contactEmail:{
        type:String,
        required:true,
        trim:true,
        lowercase:true
    },
    contactPhone:{
        type:String,
        required:true,
        trim:true
    },
    reviewUrl:{
        type:String,
        default:""
    },
    instagramUrl:{
        type:String,
        default:""
    },
    status:{
        type:String,
        enum:["ACTIVE","SUSPENDED"],
        default:"ACTIVE",
        index:true
    }
   
},
{timestamps:true}
)

export default mongoose.model("Merchant",merchantSchema);