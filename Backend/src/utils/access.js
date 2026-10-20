import mongoose from "mongoose";
import merchantModel from "../models/merchant.model.js";
import storeModel from "../models/store.model.js";
import staffModel from "../models/staff.model.js";

// Resolve the merchant account behind the logged in user. A manager or staff
// member works under the merchant that hired them.
const resolveMerchant = async (user)=>{
    const owned = await merchantModel.findOne({owner:user._id});

    if(owned){
        return owned;
    }

    const staff = await staffModel.findOne({
        user:user._id,
        isActive:true
    })

    if(!staff){
        return null;
    }

    return merchantModel.findById(staff.merchant);
}

// A store is only reachable when it belongs to the merchant making the call.
const findOwnedStore = async (merchant, storeId)=>{
    if(!merchant || !mongoose.isValidObjectId(storeId)){
        return null;
    }

    return storeModel.findOne({
        _id:storeId,
        merchant:merchant._id
    })
}

// Customer facing routes are keyed by the public store code, never by id.
const findPublicStore = async (code)=>{
    if(!code){
        return null;
    }

    return storeModel.findOne({
        publicCode:String(code).trim().toUpperCase(),
        status:"ACTIVE"
    })
}

export {resolveMerchant, findOwnedStore, findPublicStore};
