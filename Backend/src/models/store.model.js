import mongoose from 'mongoose';
import crypto from "node:crypto";

const storeSchema = new mongoose.Schema({
    merchant:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Merchant",
        required:true,
        index:true
    },
    publicCode:{
    type:  String,
    trim : true,
    uppercase : true,
    unique:true,
    sparse : true,
    default : ()=>crypto.randomBytes(6).toString("hex").toUpperCase()

    },
    name:{
        type:String,
        required:true,
        trim:true,
        maxLength:150
    },
    slug:{
        type:String,
        required:true,
        trim:true,
        lowercase:true,
    },
    phone:{
        type:String,
        required:true,
        trim:true,
    },
    address:{
        line1:String,
        line2:String,
        city:String,
        state:String,
       
        pincode:String,
        country:{
            type:String,
            default:"India"

        }
    },
    location:{
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
            required:true
        },
        coordinates: {
            type: [Number],
            required:true,
            validate : {
                validator : function (value){
                    return(
                    Array.isArray(value) &&
                     value.length === 2 &&
                        value[0] >= -180 &&
                        value[0] <= 180 &&
                        value[1] >= -90 &&
                        value[1] <= 90
                    )
                },
                message : "Invalid coordinates"
            }
            
        }
    },
    geofenceRadius:{
        type:Number,
        default : 100,
        min :20,
        max : 500

    },
    timeZone:{
        type:String,
        default:"Asia/Kolkata"
    },
    status:{
        type:String,
        enum:["ACTIVE","SUSPENDED"],
        default:"ACTIVE",
        index:true
    }

},{
    timestamps:true
})

storeSchema.index({merchant:1,slug:1},{unique:true});
storeSchema.index({location:"2dsphere"});
export default mongoose.model("Store",storeSchema);