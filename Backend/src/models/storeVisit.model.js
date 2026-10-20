import mongoose from "mongoose";

// One row per customer per store per calendar day. The visit streak counts
// these rows, so scanning on any N days hands out a gift card with or without
// gaps in between.
const storeVisitSchema = new mongoose.Schema({
    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        required:true,
        index:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    visitDay:{
        type:String,
        required:true
    },
    scannedAt:{
        type:Date,
        default:Date.now
    }
},{
    timestamps:true
});

storeVisitSchema.index({store:1,user:1,visitDay:1},{unique:true});

export default mongoose.model("StoreVisit",storeVisitSchema);
