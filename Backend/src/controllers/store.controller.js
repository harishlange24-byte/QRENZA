import merchantModel from "../models/merchant.model.js";
import storeModel from "../models/store.model.js";
import tableModel from "../models/table.model.js";
import QRCode from "qrcode";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { assertCanAddLocation, withMerchantLock, resolveAccess, hasFeature } from "../services/entitlement.service.js";


const makeSlug = (name)=>{

    return name
           .toLowerCase()
           .trim()
           .replace(/[^a-z0-9]+/g,"-")
           .replace(/^-|-$/g,"") || "store";
};

const createStore = async(req,res)=>{
    try{
        const {
            name,
            phone,
            address,
            latitude,
            longitude,
            geofenceRadius
        } = req.body;

        if(!name?.trim() ||
            !phone?.trim() ||
            latitude === undefined ||
            latitude === null ||
            latitude === "" ||
            longitude === undefined ||
            longitude === null ||
            longitude === ""
        ){
            return res.status(400).json({
                success:false,
                message:"Store name, phone and GPS coordinates are required"
            })
        }

        const lat = Number(latitude)
        const lng = Number(longitude)

        if(!Number.isFinite(lat) ||
           !Number.isFinite(lng) ||
           lat < -90 ||
           lat > 90 ||
            lng < -180 ||
           lng > 180
        ){
            return res.status(400).json({
                success:false,
                message : "Invalid GPS coordinates"
            })
        }

        const radius = 
           geofenceRadius === undefined ? 100 : Number(geofenceRadius);

           if(!Number.isFinite(radius) || radius < 20 || radius > 500){
            return res.status(400).json({
                success:false,
                message: "Geofence radius must be between 20 and 500 metres"
            })
           }

           const merchant = await merchantModel.findOne({
            owner : req.user._id,
            status : "ACTIVE"
           })

           if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
           }

           // The plan's location limit is enforced here on the server, not by
           // hiding the button in the UI. The lock keeps concurrent requests
           // from both passing the check.
           const store = await withMerchantLock(merchant._id, async ()=>{

                const guard = await assertCanAddLocation(merchant._id);

                if(!guard.allowed){
                    const limitError = new Error(guard.message);
                    limitError.status = 403;
                    limitError.code = guard.code;
                    throw limitError;
                }

                let baseSlug = makeSlug(name);
                let slug = baseSlug;
                let counter = 2;

                while(await storeModel.exists({merchant : merchant._id,slug})){
                    slug = `${baseSlug} - ${counter}`;
                    counter++;
                }

                return storeModel.create({
                    merchant : merchant._id,
                    name:name.trim(),
                    slug,
                    phone:phone.trim(),
                    address : address || {},
                    location : {
                        type : "Point",
                        coordinates : [lat,lng]
                    },
                    geofenceRadius : radius
                })
           })

           return res.status(201).json({
            success:true,
            message : "Store Created Successfully",
            store:{
            id : store._id,
            name : store.name,
            slug : store.slug,
            phone :store.phone,
            address : store.address,
            location : store.location,
            geofenceRadius : store.geofenceRadius,
            status : store.status
            }
           })

    }catch(error){

        if(error.status === 403){
            return res.status(403).json({
                success:false,
                code:error.code,
                message:error.message
            })
        }

        console.error("CreateStore error : ",error);

        if(error.code === 11000){
            return res.status(409).json({
                succes:false,
                message:"Store slug already exixst. please retry"
            })
        }
        return res.status(500).json({
            success:false,
            message:"Unable to create Stroe"
        })
    }
}

const listStores = async(req,res)=>{
    try{
        const merchant = await merchantModel.findOne({
            owner : req.user._id,
            status : "ACTIVE"
        })

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const stores = await storeModel.find({
            merchant : merchant._id
        }).sort({createdAt:-1})

        return res.status(200).json({
            success:true,
            message:"Stores fetched",
            stores : stores.map((store)=>({
                id : store._id,
                name : store.name,
                slug : store.slug,
                phone : store.phone,
                address : store.address,
                status : store.status,
                publicCode : store.publicCode
            }))
        })
    }catch(error){
        console.error("listStores error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch stores"
        })
    }
}

const getPublicStoreByCode = async (req,res)=>{

    try{
        const code =  req.params.code.trim().toUpperCase()

        const store = await storeModel.findOne({
            publicCode : code,
            status:"ACTIVE"
        }).populate(
            "merchant",
            "businessName businessType logo reviewUrl instagramUrl status"
        );

        if(!store || !store.merchant || store.merchant.status !== "ACTIVE"){
            return res.status(404).json({
                succes:false,
                message:"Store not found or inactive"
            })
        }

        // Table ordering is a paid feature, the customer screen reads this flag
        // to decide whether to show the add to cart buttons.
        const access = await resolveAccess(store.merchant._id);

        return res.status(200).json({
            success:true,
            message:"Store Found",
            store:{
                publicCode : store.publicCode,
                name : store.name,
                slug : store.slug,
                address : store.address,
                timeZone : store.timeZone,
                // The customer screen draws the shop pin and its geofence ring
                // from these two values.
                location : store.location,
                geofenceRadius : store.geofenceRadius,
                orderingEnabled : hasFeature(access,"ONLINE_ORDERING"),
                merchant:{
                        businessName: store.merchant.businessName,
                     businessType: store.merchant.businessType,
                    logo: store.merchant.logo,
                 reviewUrl: store.merchant.reviewUrl,
                 instagramUrl: store.merchant.instagramUrl
                }
            }
        });
    }catch(error){
        console.error("getPublicStoreByCode error : ",error)
        return res.status(500).json({
            success:false,
            message:"Unable to fetch store"
        })
    }
}

const getStoreQR = async (req,res)=>{
    try{
        const {storeId} = req.params;

        if(!mongoose.isValidObjectId(storeId)){
            return res.status(400).json({
                success:false,
                message : "Invalid store ID"
            })
        }
        const merchant = await merchantModel.findOne({
            owner : req.user._id,
            status : "ACTIVE"
        })

        if(!merchant){
            return res.status(404).json({
        success: false,
        message: "Active merchant account not found"
      });
        }

        const store = await storeModel.findOne({
            _id : storeId,
            merchant: merchant._id,
            status : "ACTIVE"
        })

        if(!store){
              return res.status(404).json({
        success: false,
        message: "Store not found or inactive"
            });
           }

        // Mongoose fills publicCode from the schema default while hydrating, so
        // the saved value has to be read with lean() to know if it exists yet.
        const savedStore = await storeModel
            .findOne({_id:store._id})
            .select("publicCode")
            .lean();

        if(!savedStore?.publicCode){
            let code;

            for(let attempt = 0; attempt < 5; attempt++){
                const candidate = crypto
                .randomBytes(6)
                .toString("hex")
                .toUpperCase();
            

            const alreadyExists = await storeModel.exists({
                publicCode:candidate
            })

            if(!alreadyExists){
                code  = candidate;
                break;
            }
        }
        if(!code){
             return res.status(500).json({
          success: false,
          message: "Unable to generate store code. Please retry."
        });
        }

        store.publicCode  = code;
        await store.save();
    }
        const baseUrl = process.env.RP_PUBLIC_BASE_URL?.replace(/\/+$/,"");

        if(!baseUrl){
                   return res.status(500).json({
        success: false,
        message: "RP_PUBLIC_BASE_URL is missing in environment"
      });
        }
        const targetUrl = `${baseUrl}/s/${store.publicCode}`;

        const imageDataUrl = await  QRCode.toDataURL(targetUrl,{
            errorCorrectionLevel : "H",
            margin:2,
            width : 400
        })

                    return res.status(200).json({
      success: true,
      message: "Store QR generated successfully",
      qr: {
        publicCode: store.publicCode,
        targetUrl,
        imageDataUrl
      }
    });
  } catch (error) {
    console.error("getStoreQr error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate store QR"
    });
  }

    

        
    }



const getPublicTable = async(req,res)=>{
    try{
        const code = req.params.code.trim().toUpperCase();
        const tableNumber = String(req.params.tableNumber).trim();

        const store = await storeModel.findOne({
            publicCode : code,
            status:"ACTIVE"
        })

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        const table = await tableModel.findOne({
            store : store._id,
            tableNumber
        })

        if(!table){
            return res.status(404).json({
                success:false,
                message:"Table not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"Table Found",
            table:{
                id : table._id,
                tableNumber : table.tableNumber,
                capacity : table.capacity,
                status : table.status
            }
        })
    }catch(error){
        console.error("getPublicTable error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch table"
        })
    }
}

export {createStore
    ,listStores,
     getPublicStoreByCode,
     getPublicTable,
     getStoreQR
};