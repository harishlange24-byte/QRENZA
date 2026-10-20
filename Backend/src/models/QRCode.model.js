import mongoose from 'mongoose';
const qrCodeSchema = new mongoose.Schema({
    store:{
        type:mongoose.SchemaTypes.ObjectId,
        ref:"Store",
        required:true,
        index:true,

    },
    table:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Table",
       
        index:true,
        default:null
    },
    type:{
        type:String,
        enum:["STORE","TABLE"],
        required:true,
    },
    code:{
            type:String,
            required:true,
            unique:true,
            index:true,
        },
        url:{
            type:String,
            required:true,
        },
        scanCount:{
            type:Number,
            default:0,
        },
        isActive:{
            type:Boolean,
            default:true,
        },
        generateAt:{
            type:Date,
            default:Date.now,
        }
    
},{
    timestamps:true,
})

export default mongoose.model("QRCode",qrCodeSchema);