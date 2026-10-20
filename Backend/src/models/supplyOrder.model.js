import mongoose from "mongoose";

const supplyItemSchema = new mongoose.Schema({
    productId:{
        type:String,
        required:true,
        trim:true
    },
    name:{
        type:String,
        required:true,
        trim:true
    },
    price:{
        type:Number,
        required:true,
        min:0
    },
    quantity:{
        type:Number,
        required:true,
        min:1,
        default:1
    }
},{
    _id:false
});

// A merchant order for physical Qrenza supplies (QR standee, table tent ...).
// The catalogue lives in config/supplies.js, only the line items are stored.
const supplyOrderSchema = new mongoose.Schema({
    merchant:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Merchant",
        required:true,
        index:true
    },
    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        default:null
    },
    items:{
        type:[supplyItemSchema],
        validate:{
            validator:(value)=>Array.isArray(value) && value.length > 0,
            message:"Supply order needs at least one item"
        }
    },
    subtotal:{
        type:Number,
        required:true,
        min:0
    },
    shipping:{
        type:Number,
        default:0,
        min:0
    },
    total:{
        type:Number,
        required:true,
        min:0
    },
    contactName:{
        type:String,
        required:true,
        trim:true
    },
    contactPhone:{
        type:String,
        required:true,
        trim:true
    },
    deliveryAddress:{
        type:String,
        required:true,
        trim:true,
        maxLength:400
    },
    note:{
        type:String,
        default:"",
        maxLength:300
    },
    status:{
        type:String,
        enum:["REQUESTED","CONFIRMED","PACKED","SHIPPED","DELIVERED","CANCELLED"],
        default:"REQUESTED",
        index:true
    },
    cancelledAt:{
        type:Date,
        default:null
    }
},{
    timestamps:true
});

supplyOrderSchema.index({merchant:1,status:1,createdAt:-1});

export default mongoose.model("SupplyOrder",supplyOrderSchema);
