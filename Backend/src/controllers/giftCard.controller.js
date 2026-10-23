import crypto from "node:crypto";
import mongoose from "mongoose";
import GiftCard from "../models/giftCard.model.js";
import User from "../models/user.model.js";
import StoreVisit from "../models/storeVisit.model.js";
import LoyaltyProgram from "../models/loyaltyProgram.model.js";
import Reward from "../models/reward.model.js";
import {resolveMerchant, findOwnedStore, findPublicStore} from "../utils/access.js";
import {stampCustomer} from "./loyalty.controller.js";

const DAY_MS = 24 * 60 * 60 * 1000;

// How many distinct scan days earn a gift card. Raise it with
// GIFT_CARD_VISIT_INTERVAL=10 to hand cards out less often.
const visitInterval = ()=>{
    const value = Number(process.env.GIFT_CARD_VISIT_INTERVAL || 7);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 7;
}

// A freshly issued card stays usable for this many days.
const CARD_VALIDITY_DAYS = 30;

// Fallback card when the merchant has not created any reward yet.
const FALLBACK_CARD = {
    title:"Visit streak reward",
    type:"DISCOUNT",
    discountType:"PERCENTAGE",
    value:10
};

// Visit streaks count calendar days in the store's timezone, so a late night
// scan still belongs to the right day.
const todayKey = ()=>{
    return new Intl.DateTimeFormat("en-CA",{
        timeZone:"Asia/Kolkata",
        year:"numeric",
        month:"2-digit",
        day:"2-digit"
    }).format(new Date());
}

const makeUniqueGiftCardCode = async ()=>{
    for(let attempt = 0; attempt < 5; attempt++){
        const code = `GC-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        if(!(await GiftCard.exists({code}))){
            return code;
        }
    }

    return `GC-${Date.now().toString(36).toUpperCase()}`;
}

const giftCardView = (card)=>{
    return {
        id:card._id,
        code:card.code,
        title:card.title,
        type:card.type,
        discountType:card.discountType,
        value:card.value,
        freeItemName:card.freeItemName,
        minOrderValue:card.minOrderValue,
        customerPhone:card.customerPhone || "",
        source:card.source,
        status:card.status,
        issuedAt:card.issuedAt,
        expiresAt:card.expiresAt,
        usedAt:card.usedAt
    };
}

// Cards are never swept by a cron, they are expired lazily whenever the owner
// opens the list.
const expireStaleCards = async (filter)=>{
    return GiftCard.updateMany(
        {...filter, status:"ACTIVE", expiresAt:{$lt:new Date()}},
        {$set:{status:"EXPIRED"}}
    );
}

// Hand out the streak card on every Nth distinct visit day. Scans on the same
// day never double count and a milestone is only ever paid once.
const issueStreakGiftCard = async (store,user,visitCount)=>{
    const interval = visitInterval();

    if(visitCount <= 0 || visitCount % interval !== 0){
        return null;
    }

    const alreadyIssued = await GiftCard.findOne({
        store:store._id,
        user:user._id,
        source:"STREAK",
        visitCount
    });

    if(alreadyIssued){
        return null;
    }

    // The merchant's newest active reward shapes the card, so a free item
    // reward really hands out a free item.
    const reward = await Reward.findOne({
        store:store._id,
        isActive:true
    }).sort({createdAt:-1});

    let template = FALLBACK_CARD;

    if(reward?.type === "FREE_ITEM"){
        template = {
            title:reward.name,
            type:"FREE_ITEM",
            discountType:null,
            value:0,
            freeItemName:reward.name
        };
    }else if(reward?.type === "DISCOUNT"){
        template = {
            title:reward.name,
            type:"DISCOUNT",
            discountType:reward.discountType || "PERCENTAGE",
            value:reward.value,
            freeItemName:""
        };
    }

    return GiftCard.create({
        store:store._id,
        user:user._id,
        customerPhone:user.phone || "",
        code:await makeUniqueGiftCardCode(),
        title:template.title,
        type:template.type,
        discountType:template.discountType,
        value:template.value,
        freeItemName:template.freeItemName || "",
        minOrderValue:0,
        source:"STREAK",
        visitCount,
        expiresAt:new Date(Date.now() + CARD_VALIDITY_DAYS * DAY_MS)
    });
}

// A logged in customer lands on the store page, that scan counts as a visit.
const recordVisit = async(req,res)=>{
    try{
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Please login first"
            })
        }

        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        const visitDay = todayKey();

        const alreadyScanned = await StoreVisit.findOne({
            store:store._id,
            user:req.user._id,
            visitDay
        });

        if(!alreadyScanned){
            try{
                await StoreVisit.create({
                    store:store._id,
                    user:req.user._id,
                    visitDay
                });
            }catch(error){
                // A parallel tab may have written the same day first.
                if(error.code !== 11000){
                    throw error;
                }
            }
        }

        // A shop that counts a visit as a stamp hands one out right here, so the
        // scan itself moves the card. Per purchase shops stay on the counter.
        let stamp = null;

        if(!alreadyScanned){
            const program = await LoyaltyProgram.findOne({
                store:store._id,
                isActive:true
            });

            if(program?.stampRule === "ONE_PER_VISIT"){
                stamp = await stampCustomer(store,req.user,{referenceType:"VISIT"});
            }
        }

        const totalVisits = await StoreVisit.countDocuments({
            store:store._id,
            user:req.user._id
        });

        const card = await issueStreakGiftCard(store,req.user,totalVisits);
        const interval = visitInterval();

        return res.status(200).json({
            success:true,
            message:stamp?.claim
                ? "Stamp added and a reward unlocked"
                : (card ? "You earned a gift card" : "Visit recorded"),
            data:{
                totalVisits,
                interval,
                untilNextCard:interval - (totalVisits % interval),
                giftCard:card ? giftCardView(card) : null,
                stamped:Boolean(stamp),
                rewardEarned:Boolean(stamp?.rewardEarned),
                stamps:stamp ? stamp.card.stamps : null,
                stampsRequired:stamp ? stamp.program.stampsRequired : null,
                totalStampsEarned:stamp ? stamp.card.totalStampsEarned : null,
                totalRewardsEarned:stamp ? stamp.card.totalRewardsEarned : null,
                rewardCode:stamp?.claim ? stamp.claim.code : ""
            }
        })
    }catch(error){
        console.error("recordVisit error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to record this visit"
        })
    }
}

const getMyGiftCards = async(req,res)=>{
    try{
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Please login first"
            })
        }

        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            })
        }

        // Cards bought by the merchant during an event only carry the phone, so
        // the customer's own phone must match as well as their account.
        const mine = {
            store:store._id,
            $or:[
                {user:req.user._id},
                {customerPhone:req.user.phone || "___none___"}
            ]
        };

        await expireStaleCards(mine);

        const cards = await GiftCard.find(mine).sort({createdAt:-1}).limit(50).lean();

        return res.status(200).json({
            success:true,
            message:"Gift cards fetched successfully",
            data:{giftCards:cards.map(giftCardView)}
        })
    }catch(error){
        console.error("getMyGiftCards error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch gift cards"
        })
    }
}

const listStoreGiftCards = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        await expireStaleCards({store:store._id});

        const cards = await GiftCard.find({store:store._id}).sort({createdAt:-1}).limit(100).lean();

        return res.status(200).json({
            success:true,
            message:"Gift cards fetched successfully",
            data:{giftCards:cards.map(giftCardView)}
        })
    }catch(error){
        console.error("listStoreGiftCards error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch gift cards"
        })
    }
}

// Hand a card out during an event or as a manual goodwill gesture.
const createGiftCard = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const {
            phone,
            title,
            type,
            discountType,
            value,
            freeItemName,
            minOrderValue,
            validityDays
        } = req.body;

        const customerPhone = String(phone || "").trim();

        // The phone is optional. Without it the card is a shop wide offer that
        // any customer can pick up at the counter, which is how most events run.
        if(customerPhone && !/^[6-9]\d{9}$/.test(customerPhone)){
            return res.status(400).json({
                success:false,
                message:"Enter a valid 10-digit customer phone number or leave it blank"
            })
        }

        if(!title?.trim()){
            return res.status(400).json({
                success:false,
                message:"Gift card title is required"
            })
        }

        const cardType = type === "FREE_ITEM" ? "FREE_ITEM" : "DISCOUNT";

        if(cardType === "FREE_ITEM" && !freeItemName?.trim()){
            return res.status(400).json({
                success:false,
                message:"Name the menu item this card makes free"
            })
        }

        const numericValue = Number(value || 0);

        if(cardType === "DISCOUNT" && (!Number.isFinite(numericValue) || numericValue <= 0)){
            return res.status(400).json({
                success:false,
                message:"Enter a discount value greater than 0"
            })
        }

        const resolvedDiscountType = cardType === "DISCOUNT"
            ? (discountType === "FIXED" ? "FIXED" : "PERCENTAGE")
            : null;

        // Menu prices are plain rupees, so a fixed discount and the minimum
        // order value are kept in rupees too instead of paise.
        const storedValue = cardType !== "DISCOUNT" ? 0 : numericValue;

        const days = Number(validityDays) > 0 ? Math.floor(Number(validityDays)) : CARD_VALIDITY_DAYS;

        // When a phone is given the card is also tied to that account so it
        // lands on the customer's own wallet, not just the shop list.
        const owner = customerPhone
            ? await User.findOne({phone:customerPhone}).select("_id")
            : null;

        const card = await GiftCard.create({
            store:store._id,
            user:owner?._id || null,
            customerPhone,
            code:await makeUniqueGiftCardCode(),
            title:title.trim(),
            type:cardType,
            discountType:resolvedDiscountType,
            value:storedValue,
            freeItemName:cardType === "FREE_ITEM" ? freeItemName.trim() : "",
            minOrderValue:Number(minOrderValue) > 0 ? Math.round(Number(minOrderValue)) : 0,
            source:"EVENT",
            visitCount:0,
            expiresAt:new Date(Date.now() + days * DAY_MS)
        });

        return res.status(201).json({
            success:true,
            message:"Gift card issued successfully",
            data:{giftCard:giftCardView(card)}
        })
    }catch(error){
        console.error("createGiftCard error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to issue the gift card"
        })
    }
}

// Shared with the order controller. Returns the discount in paise, or an error
// message the customer can act on.
const resolveGiftCard = async(storeId, rawCode, subtotal)=>{
    const code = String(rawCode || "").trim().toUpperCase();

    if(!code){
        return {card:null,discount:0,error:null};
    }

    const card = await GiftCard.findOne({store:storeId,code});

    if(!card){
        return {card:null,discount:0,error:"Gift card not found"};
    }

    if(card.status !== "ACTIVE"){
        return {card:null,discount:0,error:`This gift card is already ${String(card.status).toLowerCase()}`};
    }

    if(card.expiresAt.getTime() < Date.now()){
        await GiftCard.updateOne({_id:card._id},{$set:{status:"EXPIRED"}});
        return {card:null,discount:0,error:"This gift card has expired"};
    }

    if(card.minOrderValue > 0 && subtotal < card.minOrderValue){
        return {
            card:null,
            discount:0,
            error:`Add items worth ₹${Math.round(card.minOrderValue)} to use this gift card`
        };
    }

    // A free item card is matched against the order lines by the caller.
    if(card.type === "FREE_ITEM"){
        return {card,discount:0,error:null,freeItemName:card.freeItemName || card.title};
    }

    const raw = card.discountType === "FIXED"
        ? card.value
        : Math.round((subtotal * card.value) / 100);

    return {card,discount:Math.min(raw,subtotal),error:null};
}

// Pull a card back off the wall. The customer simply stops seeing it.
const deleteGiftCard = async(req,res)=>{
    try{
        const {giftCardId} = req.params;

        if(!mongoose.isValidObjectId(giftCardId)){
            return res.status(400).json({
                success:false,
                message:"Invalid gift card id"
            })
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const card = await GiftCard.findOneAndDelete({
            _id:giftCardId,
            store:store._id
        });

        if(!card){
            return res.status(404).json({
                success:false,
                message:"Gift card not found"
            })
        }

        return res.status(200).json({
            success:true,
            message:"Gift card deleted successfully"
        })
    }catch(error){
        console.error("deleteGiftCard error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to delete gift card"
        })
    }
}

export {
    recordVisit,
    getMyGiftCards,
    listStoreGiftCards,
    createGiftCard,
    deleteGiftCard,
    resolveGiftCard,
    giftCardView
};
