import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema({
    menu:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Menu",
        required:true,
        index:true,
    },
    category:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"MenuCategory",
        required:true,
        index:true,
    },
    store:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Store",
        required:true,
        index:true,
    },
    name:{
        type:String,
        required:true,
        trim:true,
        maxlength:100,
    },
    description:{
        type:String,
        default:"Item Description",
    },
    price:{
        type:Number,
        required:true,
        min:0,
    },
    image:{
        type:String,
        default:null,
    },
    isVeg:{
        type:Boolean,
        default:true,
    },
    isAvailable:{
        type:Boolean,
        default:true,
        index:true
    },
    preparationTimeMinutes:{
        type:Number,
        min:0,
        default:10,
    },
    sortOrder:{
        type:Number,
        default:0
    }
},
{
    timestamps:true
});

menuItemSchema.index({store:1,category:1,sortOrder:1});
export default mongoose.model("MenuItem",menuItemSchema);