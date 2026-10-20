import staffModel from "../models/staff.model.js";
import userModel from "../models/user.model.js";
import { resolveMerchant, findOwnedStore } from "../utils/access.js";

const STAFF_ROLES = ["MANAGER", "STAFF"];

const listStaff = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const staff = await staffModel.find({store:store._id})
            .sort({createdAt:-1})
            .populate("user","name phone role")
            .lean()

        return res.status(200).json({
            success:true,
            message:"Staff fetched successfully",
            data:{staff}
        })
    }catch(error){
        console.error("listStaff error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch staff"
        })
    }
}

const addStaff = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const {phone, role, employeeCode} = req.body;

        if(!phone?.trim()){
            return res.status(400).json({
                success:false,
                message:"Phone number is required"
            })
        }

        const resolvedRole = role || "STAFF";

        if(!STAFF_ROLES.includes(resolvedRole)){
            return res.status(400).json({
                success:false,
                message:"Role must be MANAGER or STAFF"
            })
        }

        const user = await userModel.findOne({phone:phone.trim()});

        if(!user){
            return res.status(404).json({
                success:false,
                message:"No user found with this phone number"
            })
        }

        const payload = {
            user:user._id,
            merchant:merchant._id,
            store:store._id,
            role:resolvedRole
        };

        // employeeCode is sparse-unique, so an empty string must not be stored.
        const code = employeeCode?.trim();

        if(code){
            payload.employeeCode = code;
        }

        let staff;

        try{
            staff = await staffModel.create(payload);
        }catch(error){
            if(error.code === 11000){
                if(error.keyPattern?.employeeCode){
                    return res.status(409).json({
                        success:false,
                        message:"Employee code already in use"
                    })
                }

                return res.status(409).json({
                    success:false,
                    message:"Staff already added"
                })
            }

            throw error;
        }

        return res.status(201).json({
            success:true,
            message:"Staff added successfully",
            data:{staff}
        })
    }catch(error){
        console.error("addStaff error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to add staff"
        })
    }
}

export {listStaff, addStaff};
