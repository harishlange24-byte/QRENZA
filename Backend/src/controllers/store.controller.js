import merchantModel from "../models/merchant.model.js";
import storeModel from "../models/store.model.js";
import tableModel from "../models/table.model.js";
import menuModel from "../models/menu.model.js";
import menuCategoryModel from "../models/menuCategory.model.js";
import menuItemModel from "../models/menuItem.model.js";
import loyaltyProgramModel from "../models/loyaltyProgram.model.js";
import loyaltyCardModel from "../models/loyaltyCard.model.js";
import rewardModel from "../models/reward.model.js";
import rewardClaimModel from "../models/rewardClaim.model.js";
import giftCardModel from "../models/giftCard.model.js";
import storeVisitModel from "../models/storeVisit.model.js";
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
                // The edit form needs these two back to prefill the pin and ring.
                location : store.location,
                geofenceRadius : store.geofenceRadius,
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



// Edit a store the merchant already owns. Only the fields that were actually
// sent are touched, so a partial form never wipes the rest of the record.
const updateStore = async(req,res)=>{
    try{
        const {storeId} = req.params;

        if(!mongoose.isValidObjectId(storeId)){
            return res.status(400).json({
                success:false,
                message:"Invalid store ID"
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

        const store = await storeModel.findOne({
            _id : storeId,
            merchant : merchant._id
        })

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const {
            name,
            phone,
            address,
            latitude,
            longitude,
            geofenceRadius
        } = req.body || {};

        if(name !== undefined){
            if(!String(name).trim()){
                return res.status(400).json({
                    success:false,
                    message:"Store name cannot be empty"
                })
            }
            store.name = String(name).trim();
        }

        if(phone !== undefined){
            if(!String(phone).trim()){
                return res.status(400).json({
                    success:false,
                    message:"Store phone cannot be empty"
                })
            }
            store.phone = String(phone).trim();
        }

        if(address !== undefined && address !== null){
            store.address = {...(store.address?.toObject?.() || store.address || {}),...address};
        }

        if(latitude !== undefined || longitude !== undefined){
            const lat = Number(latitude ?? store.location.coordinates[1]);
            const lng = Number(longitude ?? store.location.coordinates[0]);

            if(!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180){
                return res.status(400).json({
                    success:false,
                    message:"Invalid GPS coordinates"
                })
            }

            store.location = {type:"Point",coordinates:[lng,lat]};
        }

        if(geofenceRadius !== undefined && geofenceRadius !== null && geofenceRadius !== ""){
            const radius = Number(geofenceRadius);

            if(!Number.isFinite(radius) || radius < 20 || radius > 500){
                return res.status(400).json({
                    success:false,
                    message:"Geofence radius must be between 20 and 500 metres"
                })
            }

            store.geofenceRadius = radius;
        }

        await store.save();

        return res.status(200).json({
            success:true,
            message:"Store updated successfully",
            store:{
                id : store._id,
                name : store.name,
                slug : store.slug,
                phone : store.phone,
                address : store.address,
                location : store.location,
                geofenceRadius : store.geofenceRadius,
                status : store.status,
                publicCode : store.publicCode
            }
        })
    }catch(error){
        console.error("updateStore error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to update store"
        })
    }
}

// Deleting a location also clears the catalogue that only existed for it
// (menu, tables, stamp programme). Order and loyalty history is kept.
const deleteStore = async(req,res)=>{
    try{
        const {storeId} = req.params;

        if(!mongoose.isValidObjectId(storeId)){
            return res.status(400).json({
                success:false,
                message:"Invalid store ID"
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

        const store = await storeModel.findOne({
            _id : storeId,
            merchant : merchant._id
        })

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const menu = await menuModel.findOne({store:store._id});

        if(menu){
            await menuItemModel.deleteMany({menu:menu._id});
            await menuCategoryModel.deleteMany({menu:menu._id});
            await menuModel.deleteOne({_id:menu._id});
        }

        await tableModel.deleteMany({store:store._id});
        await loyaltyProgramModel.deleteMany({store:store._id});
        await storeModel.deleteOne({_id:store._id});

        return res.status(200).json({
            success:true,
            message:"Store deleted"
        })
    }catch(error){
        console.error("deleteStore error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to delete store"
        })
    }
}

// The customer "All shops" screen. Every live shop is listed with the campaign
// it is running, and a signed in customer also sees their own numbers there.
const listPublicStores = async(req,res)=>{
    try{
        const stores = await storeModel
            .find({status:"ACTIVE"})
            .populate("merchant","businessName businessType logo status")
            .sort({createdAt:-1})
            .limit(200)
            .lean();

        const live = stores.filter((store)=>store.merchant && store.merchant.status === "ACTIVE");
        const storeIds = live.map((store)=>store._id);

        const [programs,rewards,giftCards] = await Promise.all([
            loyaltyProgramModel.find({store:{$in:storeIds},isActive:true}).lean(),
            rewardModel.find({store:{$in:storeIds},isActive:true}).lean(),
            giftCardModel.find({store:{$in:storeIds},status:"ACTIVE"}).select("store title source expiresAt").lean()
        ]);

        const mine = {cards:{},claims:{},giftCards:{},visits:{}};
        const totals = {shops:0,stamps:0,rewards:0,activeRewards:0,giftCards:0,visits:0};

        if(req.user && storeIds.length){
            const [cards,claims,giftCards,visits] = await Promise.all([
                loyaltyCardModel.find({user:req.user._id,store:{$in:storeIds}}).lean(),
                rewardClaimModel.find({user:req.user._id,store:{$in:storeIds}}).lean(),
                giftCardModel.find({user:req.user._id,store:{$in:storeIds},status:"ACTIVE"}).lean(),
                storeVisitModel.aggregate([
                    {$match:{user:req.user._id,store:{$in:storeIds}}},
                    {$group:{_id:"$store",count:{$sum:1}}}
                ])
            ]);

            const now = Date.now();

            for(const card of cards){
                mine.cards[String(card.store)] = card;
            }

            for(const visit of visits){
                mine.visits[String(visit._id)] = visit.count;
            }

            for(const card of giftCards){
                const key = String(card.store);
                mine.giftCards[key] = (mine.giftCards[key] || 0) + 1;
            }

            // A claim only counts as active while it is unspent and not expired.
            for(const claim of claims){
                const key = String(claim.store);
                const bucket = mine.claims[key] || {total:0,active:0};

                bucket.total += 1;

                if(claim.status === "ACTIVE" && claim.expiresAt && claim.expiresAt.getTime() > now){
                    bucket.active += 1;
                }

                mine.claims[key] = bucket;
            }

            const visited = new Set([
                ...cards.map((card)=>String(card.store)),
                ...claims.map((claim)=>String(claim.store)),
                ...visits.map((visit)=>String(visit._id))
            ]);

            totals.shops = visited.size;
            totals.stamps = cards.reduce((sum,card)=>sum + card.totalStampsEarned,0);
            totals.rewards = claims.length;
            totals.activeRewards = Object.values(mine.claims).reduce((sum,bucket)=>sum + bucket.active,0);
            totals.giftCards = Object.values(mine.giftCards).reduce((sum,count)=>sum + count,0);
            totals.visits = visits.reduce((sum,visit)=>sum + visit.count,0);
        }

        const programByStore = {};
        const rewardCountByStore = {};
        const rewardNamesByStore = {};
        const giftCardCountByStore = {};

        for(const program of programs){
            programByStore[String(program.store)] = program;
        }

        for(const reward of rewards){
            const key = String(reward.store);
            rewardCountByStore[key] = (rewardCountByStore[key] || 0) + 1;
            (rewardNamesByStore[key] = rewardNamesByStore[key] || []).push(reward.name);
        }

        for(const card of giftCards){
            const key = String(card.store);
            giftCardCountByStore[key] = (giftCardCountByStore[key] || 0) + 1;
        }

        return res.status(200).json({
            success:true,
            message:"Shops fetched",
            data:{
                shops: live.map((store)=>{
                    const key = String(store._id);
                    const program = programByStore[key] || null;
                    const card = mine.cards[key] || null;
                    const claims = mine.claims[key] || {total:0,active:0};
                    const stampsRequired = program?.stampsRequired || 10;

                    return {
                        code : store.publicCode,
                        name : store.name,
                        slug : store.slug,
                        address : store.address,
                        location : store.location,
                        geofenceRadius : store.geofenceRadius,
                        businessName : store.merchant.businessName,
                        businessType : store.merchant.businessType,
                        logo : store.merchant.logo,
                        // The two campaigns a customer shops around for.
                        stamps : program ? {
                            running : true,
                            name : program.name,
                            rewardText : program.rewardText || "",
                            stampsRequired,
                            stampRule : program.stampRule
                        } : {running : false},
                        rewards : {
                            running : Boolean(rewardCountByStore[key]),
                            count : rewardCountByStore[key] || 0,
                            names : (rewardNamesByStore[key] || []).slice(0,4)
                        },
                        giftCards : {
                            running : Boolean(giftCardCountByStore[key]),
                            count : giftCardCountByStore[key] || 0
                        },
                        mine : req.user ? {
                            stamps : card?.stamps || 0,
                            stampsRequired,
                            stampsLeft : Math.max(0, stampsRequired - (card?.stamps || 0)),
                            totalStampsEarned : card?.totalStampsEarned || 0,
                            totalRewardsEarned : card?.totalRewardsEarned || 0,
                            activeRewards : claims.active,
                            totalRewards : claims.total,
                            giftCards : mine.giftCards[key] || 0,
                            visits : mine.visits[key] || 0
                        } : null
                    }
                }),
                totals : req.user ? totals : null
            }
        })
    }catch(error){
        console.error("listPublicStores error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch shops"
        })
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
     updateStore,
     deleteStore,
     listPublicStores,
     getPublicStoreByCode,
     getPublicTable,
     getStoreQR
};