import mongoose from 'mongoose';
const menuCategorySchema = new mongoose.Schema({
    menu:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Menu",
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
        default:"Category Description",
    },
        sortOrder:{
            type:Number,
            default:0,
        },
        isActive:{
            type:Boolean,
            default:true,
        }
      
},{
    timestamps:true,
});

menuCategorySchema.index({menu:1,name:1},{unique:true});
export default mongoose.model("MenuCategory",menuCategorySchema);