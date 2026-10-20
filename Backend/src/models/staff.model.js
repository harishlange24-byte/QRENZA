import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
    {
        user:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true,
        },
        merchant:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Merchant",
            required:true,
        },
        store:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Store",
            required:true,
            index:true
        },
        role:{
            type:String,
            enum:["MANAGER","STAFF"],
            default:"STAFF",
        },
        employeeCode:{
            type:String,
            trim:true,
            unique:true,
            sparse:true
        },
        isActive:{
            type:Boolean,
            default:true
        }
    },{
        timestamps:true,
    });

    staffSchema.index({store:1,user:1},{unique:true});
    export default mongoose.model("Staff",staffSchema);