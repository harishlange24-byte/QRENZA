import mongoose from 'mongoose';

const tableSchema = new mongoose.Schema({
    store:{
        type:mongoose.SchemaTypes.ObjectId,
        ref:"Store",
        required:true,
        index:true,
    },
    tableNumber:{
        type:String,
        required:true,
        trim:true,
    },
    capacity:{
        type:Number,
        min:1,
        default:1,
    },
    status:{
        type:String,
        enum:["AVAILABLE","OCCUPIED","RESERVED"],
        default:"AVAILABLE"
    },

},{
    timestamps:true,
});

tableSchema.index({store:1,tableNumber:1},{unique:true});
export default mongoose.model("Table",tableSchema);
