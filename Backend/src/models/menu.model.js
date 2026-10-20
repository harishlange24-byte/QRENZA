import mongoose from 'mongoose';

const menuSchema = new mongoose.Schema({
    store:{
        type:mongoose.SchemaTypes.ObjectId,
        ref:"Store",
        required:true,
        unique:true,
    },
    name:{
        type:String,
        default:"Main Menu",
        trim:true,
    },
    description:{
        type:String,
        default:"Menu Description",
    },
    currency:{
        type:String,
        default:"INR",
    },
    isPublished:{
        type:Boolean,
        default:false,
    }
},{
    timestamps:true,
});
export default mongoose.model("Menu",menuSchema);