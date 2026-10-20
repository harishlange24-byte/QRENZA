import crypto from "node:crypto";
import User from "../models/user.model.js";
import LoyaltyProgram from "../models/loyaltyProgram.model.js";
import LoyaltyCard from "../models/loyaltyCard.model.js";
import LoyaltyTransaction from "../models/loyaltyTransaction.model.js";
import Reward from "../models/reward.model.js";
import RewardClaim from "../models/rewardClaim.model.js";
import {resolveMerchant, findOwnedStore, findPublicStore} from "../utils/access.js";
import {distanceMeters, storePoint, readCoords} from "../utils/geo.js";


const DAY_MS = 24 * 60 * 60 * 1000;

// A claim code must never collide, the schema marks it unique.
const makeUniqueClaimCode = async ()=>{
    for(let attempt = 0; attempt < 5; attempt++){
        const code = crypto.randomBytes(4).toString("hex").toUpperCase();

        if(!(await RewardClaim.exists({code}))){
            return code;
        }
    }

    return crypto.randomBytes(4).toString("hex").toUpperCase();
}

// Shared card shape so both admin and customer views read the same keys.
const cardView = (card,program)=>{
    const programView = program ? {
        name : program.name,
        stampsRequired : program.stampsRequired,
        stampRule : program.stampRule
    } : null;

    return {
        stamps : card.stamps,
        totalStampsEarned : card.totalStampsEarned,
        totalRewardsEarned : card.totalRewardsEarned,
        status : card.status,
        program : programView
    };
}

const getMyLoyalty = async (req,res)=>{
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

        const program = await LoyaltyProgram.findOne({
            store : store._id,
            isActive : true
        })

        if(!program){
            return res.status(200).json({
                success:true,
                message:"This store has no loyalty program yet",
                data : {
                    program : null,
                    card : null
                }
            })
        }

        let card = await LoyaltyCard.findOne({
            user : req.user._id,
            store : store._id
        })

        // The card appears the first time the customer opens their stamp page.
        if(!card){
            card = await LoyaltyCard.create({
                user : req.user._id,
                store : store._id,
                program : program._id
            })
        }

        return res.status(200).json({
            success:true,
            message:"Loyalty card fetched",
            data : {
                program : {
                    name : program.name,
                    stampsRequired : program.stampsRequired,
                    stampRule : program.stampRule
                },
                card : cardView(card,program)
            }
        })
    }catch(error){
        console.error("getMyLoyalty error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch loyalty card"
        })
    }
}

const addStamp = async (req,res)=>{
    try{
        const {phone, note} = req.body;

        if(!phone?.toString().trim()){
            return res.status(400).json({
                success:false,
                message:"Customer phone is required"
            })
        }

        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const customer = await User.findOne({phone : String(phone).trim()});

        if(!customer){
            return res.status(404).json({
                success:false,
                message:"Customer not found"
            })
        }

        const program = await LoyaltyProgram.findOne({
            store : store._id,
            isActive : true
        })

        if(!program){
            return res.status(404).json({
                success:false,
                message:"No active loyalty program for this store"
            })
        }

        let card = await LoyaltyCard.findOne({
            user : customer._id,
            store : store._id
        })

        if(!card){
            card = await LoyaltyCard.create({
                user : customer._id,
                store : store._id,
                program : program._id
            })
        }

        card.stamps += 1;
        card.totalStampsEarned += 1;

        let rewardEarned = false;

        // Filling the card resets the counter and unlocks one reward.
        if(card.stamps >= program.stampsRequired){
            card.stamps = 0;
            card.totalRewardsEarned += 1;
            rewardEarned = true;
        }

        await card.save();

        await LoyaltyTransaction.create({
            user : customer._id,
            store : store._id,
            type : "STAMP",
            delta : 1,
            balanceAfter : card.stamps,
            performendBy : req.user._id,
            referenceType : "PURCHASE",
            note : note ? String(note) : ""
        })

        let claim = null;

        if(rewardEarned){
            const reward = await Reward.findOne({
                store : store._id,
                isActive : true
            }).sort({createdAt : 1});

            const hasCapacity = reward &&
                (reward.maxClaims === null ||
                 reward.maxClaims === undefined ||
                 reward.claimedCount < reward.maxClaims);

            // No reward configured or it is fully claimed: skip silently.
            if(hasCapacity){
                const expiresAt = new Date(
                    Date.now() + (reward.validityDays || 30) * DAY_MS
                );

                claim = await RewardClaim.create({
                    user : customer._id,
                    store : store._id,
                    reward : reward._id,
                    source : "LOYALTY_MILESTONE",
                    code : await makeUniqueClaimCode(),
                    expiresAt
                })

                reward.claimedCount += 1;

                await reward.save();
            }
        }

        return res.status(200).json({
            success:true,
            message : claim ? "Stamp added, reward earned!" : "Stamp added",
            data : {
                card : cardView(card, program),
                rewardEarned,
                claim : claim ? {
                    code : claim.code,
                    status : claim.status,
                    expiresAt : claim.expiresAt
                } : null
            }
        })
    }catch(error){
        console.error("addStamp error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to add stamp"
        })
    }
}

const getLoyaltyProgram = async (req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const program = await LoyaltyProgram.findOne({store : store._id});

        return res.status(200).json({
            success:true,
            message:"Loyalty program fetched",
            data : {program : program || null}
        })
    }catch(error){
        console.error("getLoyaltyProgram error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch loyalty program"
        })
    }
}

const upsertLoyaltyProgram = async (req,res)=>{
    try{
        const {name, stampsRequired, stampRule, isActive} = req.body;

        if(!name?.toString().trim()){
            return res.status(400).json({
                success:false,
                message:"Program name is required"
            })
        }

        const required = Number(stampsRequired);

        if(!Number.isInteger(required) || required < 1){
            return res.status(400).json({
                success:false,
                message:"stampsRequired must be an integer of at least 1"
            })
        }

        const rule = stampRule || "ONE_PER_PURCHASE";

        if(!["ONE_PER_VISIT","ONE_PER_PURCHASE"].includes(rule)){
            return res.status(400).json({
                success:false,
                message:"stampRule must be ONE_PER_VISIT or ONE_PER_PURCHASE"
            })
        }

        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const program = await LoyaltyProgram.findOneAndUpdate(
            {store : store._id},
            {
                $set : {
                    name : name.trim(),
                    stampsRequired : required,
                    stampRule : rule,
                    isActive : isActive === undefined ? true : Boolean(isActive)
                }
            },
            {new : true, upsert : true, setDefaultsOnInsert : true}
        )

        return res.status(200).json({
            success:true,
            message:"Loyalty program saved",
            data : {program}
        })
    }catch(error){
        console.error("upsertLoyaltyProgram error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to save loyalty program"
        })
    }
}

const scratchReward = async (req,res)=>{
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

        // Anti-abuse: a scratch card is only valid while the customer is inside
        // the store geofence, so the prize cannot be farmed from home.
        const shop = storePoint(store);

        if(shop){
            const coords = readCoords(req.body);

            if(!coords){
                return res.status(400).json({
                    success:false,
                    code:"LOCATION_REQUIRED",
                    message:"Allow location access to scratch this card"
                })
            }

            const metres = distanceMeters(coords, shop);

            if(metres > store.geofenceRadius){
                return res.status(403).json({
                    success:false,
                    code:"OUTSIDE_GEOFENCE",
                    message:`You need to be at the store to scratch this card, you are ${metres} m away`,
                    data : {
                        distanceMeters : metres,
                        geofenceRadius : store.geofenceRadius
                    }
                })
            }
        }

        const rewards = await Reward.find({
            store : store._id,
            isActive : true,
            probability : {$gt : 0}
        })

        // Capacity is checked in code so a null maxClaims means unlimited.
        const eligible = rewards.filter((reward)=>
            reward.maxClaims === null ||
            reward.maxClaims === undefined ||
            reward.claimedCount < reward.maxClaims
        )

        if(!eligible.length){
            return res.status(200).json({
                success:true,
                message:"No rewards available right now, please try again later",
                data : {claim : null}
            })
        }

        const totalWeight = eligible.reduce((sum,reward)=>sum + reward.probability, 0);

        let roll = Math.random() * totalWeight;
        let picked = eligible[eligible.length - 1];

        for(const reward of eligible){
            roll -= reward.probability;

            if(roll <= 0){
                picked = reward;
                break;
            }
        }

        picked.claimedCount += 1;

        await picked.save();

        const expiresAt = new Date(Date.now() + (picked.validityDays || 30) * DAY_MS);

        const claim = await RewardClaim.create({
            user : req.user._id,
            store : store._id,
            reward : picked._id,
            source : "SCRATCH",
            code : await makeUniqueClaimCode(),
            expiresAt
        })

        return res.status(200).json({
            success:true,
            message:"You won a reward!",
            data : {
                claim : {
                    code : claim.code,
                    status : claim.status,
                    expiresAt : claim.expiresAt
                },
                reward : {
                    id : picked._id,
                    name : picked.name,
                    description : picked.description,
                    type : picked.type,
                    discountType : picked.discountType,
                    value : picked.value
                }
            }
        })
    }catch(error){
        console.error("scratchReward error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to process scratch card"
        })
    }
}

const getMyRewards = async (req,res)=>{
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

        // Flip stale claims before reading so the customer sees the real status.
        await RewardClaim.updateMany(
            {
                user : req.user._id,
                store : store._id,
                status : "ACTIVE",
                expiresAt : {$lt : new Date()}
            },
            {$set : {status : "EXPIRED"}}
        )

        const claims = await RewardClaim.find({
            user : req.user._id,
            store : store._id
        })
        .populate("reward","name description type discountType value")
        .sort({createdAt : -1});

        return res.status(200).json({
            success:true,
            message:"Rewards fetched",
            data : {claims}
        })
    }catch(error){
        console.error("getMyRewards error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch rewards"
        })
    }
}

const listRewards = async (req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const rewards = await Reward.find({store : store._id}).sort({createdAt : -1});

        return res.status(200).json({
            success:true,
            message:"Rewards fetched",
            data : {rewards}
        })
    }catch(error){
        console.error("listRewards error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch rewards"
        })
    }
}

const createReward = async (req,res)=>{
    try{
        const {
            name,
            description,
            type,
            discountType,
            value,
            probability,
            maxClaims,
            validityDays
        } = req.body;

        if(!name?.toString().trim()){
            return res.status(400).json({
                success:false,
                message:"Reward name is required"
            })
        }

        if(!type){
            return res.status(400).json({
                success:false,
                message:"Reward type is required"
            })
        }

        if(!["DISCOUNT","FREE_ITEM","COUPON","CUSTOM"].includes(type)){
            return res.status(400).json({
                success:false,
                message:"Reward type must be DISCOUNT, FREE_ITEM, COUPON or CUSTOM"
            })
        }

        const rewardValue = value === undefined || value === null || value === "" ? 0 : Number(value);
        const rewardProbability = probability === undefined || probability === null || probability === "" ? 0 : Number(probability);
        const rewardValidity = validityDays === undefined || validityDays === null || validityDays === "" ? 30 : Number(validityDays);
        const rewardMaxClaims = maxClaims === undefined || maxClaims === null || maxClaims === "" ? null : Number(maxClaims);

        if(!Number.isFinite(rewardValue) || rewardValue < 0){
            return res.status(400).json({
                success:false,
                message:"value must be a non-negative number"
            })
        }

        if(!Number.isFinite(rewardProbability) || rewardProbability < 0){
            return res.status(400).json({
                success:false,
                message:"probability must be a non-negative number"
            })
        }

        if(!Number.isFinite(rewardValidity) || rewardValidity < 1){
            return res.status(400).json({
                success:false,
                message:"validityDays must be a number of at least 1"
            })
        }

        if(rewardMaxClaims !== null && (!Number.isFinite(rewardMaxClaims) || rewardMaxClaims < 1)){
            return res.status(400).json({
                success:false,
                message:"maxClaims must be a number of at least 1"
            })
        }

        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const reward = await Reward.create({
            store : store._id,
            name : name.trim(),
            description : description ? String(description) : "",
            type,
            discountType : discountType || null,
            value : rewardValue,
            probability : rewardProbability,
            maxClaims : rewardMaxClaims,
            validityDays : rewardValidity,
            isActive : true
        })

        return res.status(201).json({
            success:true,
            message:"Reward created successfully",
            data : {reward}
        })
    }catch(error){
        console.error("createReward error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to create reward"
        })
    }
}

const redeemClaim = async (req,res)=>{
    try{
        const {code} = req.body;

        if(!code?.toString().trim()){
            return res.status(400).json({
                success:false,
                message:"Claim code is required"
            })
        }

        const merchant = await resolveMerchant(req.user);

        if(!merchant){
            return res.status(404).json({
                success:false,
                message:"Active merchant account not found"
            })
        }

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const claim = await RewardClaim.findOne({
            code : String(code).trim().toUpperCase(),
            store : store._id
        })

        if(!claim){
            return res.status(404).json({
                success:false,
                message:"Reward claim not found"
            })
        }

        if(claim.status === "REDEEMED" || claim.status === "CANCELLED"){
            return res.status(409).json({
                success:false,
                message:`Reward claim is already ${claim.status.toLowerCase()}`
            })
        }

        if(claim.status === "EXPIRED"){
            return res.status(409).json({
                success:false,
                message:"Reward claim has expired"
            })
        }

        if(claim.expiresAt && claim.expiresAt < new Date()){
            claim.status = "EXPIRED";

            await claim.save();

            return res.status(409).json({
                success:false,
                message:"Reward claim has expired"
            })
        }

        claim.status = "REDEEMED";
        claim.redeemedAt = new Date();

        await claim.save();

        return res.status(200).json({
            success:true,
            message:"Reward redeemed successfully",
            data : {claim}
        })
    }catch(error){
        console.error("redeemClaim error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to redeem reward"
        })
    }
}

export {getMyLoyalty, addStamp, getLoyaltyProgram, upsertLoyaltyProgram, scratchReward, getMyRewards, listRewards, createReward, redeemClaim};
