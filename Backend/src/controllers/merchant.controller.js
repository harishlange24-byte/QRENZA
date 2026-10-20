import Merchant from "../models/merchant.model.js";
import User from "../models/user.model.js";

const CreateMerchant = async (req,res)=>{
    try{
        const {
            businessName,
            businessType,
            contactEmail,
            contactPhone,
            logo,
            reviewUrl,
            instagramUrl
        } = req.body;

        if(!businessName || !businessType || !contactEmail || !contactPhone){
            return res.status(400).json({
                success:false,
                message:"Business Details are required "
            })
        }
        const user = req.user;
        const existingMerchant = await Merchant.findOne({owner : user._id})
        if(existingMerchant){
            return res.status(409).json({
                success:false,
                message:"Merchant Already Exist"
            })
        }

        const merchant  = await Merchant.create({
            owner:user._id,
            businessName,
            businessType,
            contactEmail,
            contactPhone,
            logo : logo || "",
            reviewUrl : reviewUrl || "",
            instagramUrl : instagramUrl || ""
        })

        user.role = "MERCHANT";
        await user.save();

        return res.status(201).json({
            success : true,
            message : "Merchant account Created Successfully",
            merchant : {
                id : merchant._id,
                businessName : merchant.businessName,
                businessType : merchant.businessType,
                status : merchant.status
                
            }
        })
 

    }catch(error){
        console.error("CreateMerchant error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable create merchant account"
        })
    }
}

const getMerchantMe = async(req,res)=>{
    try{
        const merchant = await Merchant.findOne({owner : req.user._id})

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Merchant account not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"Merchant fetched",
            merchant : {
                id : merchant._id,
                businessName : merchant.businessName,
                businessType : merchant.businessType,
                contactEmail : merchant.contactEmail,
                contactPhone : merchant.contactPhone,
                logo : merchant.logo,
                reviewUrl : merchant.reviewUrl,
                instagramUrl : merchant.instagramUrl,
                status : merchant.status
            }
        })
    }catch(error){
        console.error("getMerchantMe error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch merchant account"
        })
    }
}

export {CreateMerchant, getMerchantMe};