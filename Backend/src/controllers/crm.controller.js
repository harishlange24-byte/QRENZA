import mongoose from "mongoose";
import storeModel from "../models/store.model.js";
import menuItemModel from "../models/menuItem.model.js";
import orderModel from "../models/order.model.js";
import issueModel from "../models/issue.model.js";
import queueEntryModel from "../models/queueEntry.model.js";
import rewardModel from "../models/reward.model.js";
import giftCardModel from "../models/giftCard.model.js";
import loyaltyCardModel from "../models/loyaltyCard.model.js";
import loyaltyTransactionModel from "../models/loyaltyTransaction.model.js";
import rewardClaimModel from "../models/rewardClaim.model.js";
import analyticEventModel from "../models/analyticEvent.model.js";
import campaignModel from "../models/campaign.model.js";
import feedbackModel from "../models/feedback.model.js";
import userModel from "../models/user.model.js";
import { resolveMerchant, findOwnedStore } from "../utils/access.js";

const CAMPAIGN_CHANNELS = ["WHATSAPP", "IN_APP"];

const CAMPAIGN_SEGMENTS = [
    "ALL_CUSTOMERS",
    "INACTIVE_CUSTOMERS",
    "FREQUENT_CUSTOMERS",
    "REWARD_HOLDERS"
];

const getCrmStats = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [totalCustomers, blockedCards, newCustomers, cardTotals, rewardClaims] = await Promise.all([
            loyaltyCardModel.countDocuments({store:store._id}),
            loyaltyCardModel.countDocuments({store:store._id, status:"BLOCKED"}),
            loyaltyCardModel.countDocuments({store:store._id, createdAt:{$gte:thirtyDaysAgo}}),
            loyaltyCardModel.aggregate([
                {$match:{store:store._id}},
                {$group:{_id:null, visits:{$sum:"$totalStampsEarned"}}}
            ]),
            rewardClaimModel.countDocuments({store:store._id})
        ])

        const visits = cardTotals.length ? cardTotals[0].visits : 0;

        return res.status(200).json({
            success:true,
            message:"CRM stats fetched successfully",
            data:{
                stats:{
                    totalCustomers,
                    activeCustomers: totalCustomers - blockedCards,
                    inactiveCustomers: blockedCards,
                    blockedCards,
                    newCustomers,
                    rewardClaims,
                    visits
                }
            }
        })
    }catch(error){
        console.error("getCrmStats error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch CRM stats"
        })
    }
}

const getCrmCustomers = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const search = req.query.search?.trim();

        const query = {store:store._id};

        if(search){
            const users = await userModel.find({
                $or:[
                    {phone:{$regex:search, $options:"i"}},
                    {name:{$regex:search, $options:"i"}}
                ]
            }).select("_id").lean();

            query.user = {$in:users.map(user=>user._id)};
        }

        const cards = await loyaltyCardModel.find(query)
            .sort({createdAt:-1})
            .limit(200)
            .populate("user","name phone email")
            .lean()

        const customers = cards
            .filter(card=>card.user)
            .map(card=>({
                _id:card.user._id,
                userId:card.user._id,
                cardId:card._id,
                name:card.user.name || "",
                phone:card.user.phone || "",
                email:card.user.email || "",
                stamps:card.stamps,
                totalStampsEarned:card.totalStampsEarned,
                status:card.status,
                createdAt:card.createdAt
            }))

        return res.status(200).json({
            success:true,
            message:"Customers fetched successfully",
            data:{customers}
        })
    }catch(error){
        console.error("getCrmCustomers error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch customers"
        })
    }
}

const getCustomerProfile = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const {userId} = req.params;

        if(!mongoose.isValidObjectId(userId)){
            return res.status(400).json({
                success:false,
                message:"Invalid customer ID"
            })
        }

        const card = await loyaltyCardModel.findOne({
            user:userId,
            store:store._id
        }).lean()

        if(!card){
            return res.status(404).json({
                success:false,
                message:"Customer not found"
            })
        }

        const [user, transactions, rewardClaims] = await Promise.all([
            userModel.findById(userId).select("name phone email role lastLoginAt").lean(),
            loyaltyTransactionModel.find({user:userId})
                .sort({createdAt:-1})
                .limit(20)
                .lean(),
            rewardClaimModel.find({user:userId, store:store._id})
                .sort({claimedAt:-1})
                .lean()
        ])

        const lastVisit = transactions.length ? transactions[0].createdAt : null;

        return res.status(200).json({
            success:true,
            message:"Customer profile fetched successfully",
            data:{
                customer:{
                    _id:userId,
                    name:user?.name || "",
                    phone:user?.phone || "",
                    email:user?.email || "",
                    role:user?.role,
                    visits:card.totalStampsEarned,
                    stamps:card.stamps,
                    status:card.status,
                    lastVisit,
                    card,
                    transactions,
                    rewardClaims
                }
            }
        })
    }catch(error){
        console.error("getCustomerProfile error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch customer profile"
        })
    }
}

const getAnalytics = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const requestedDays = Number(req.query.days);
        const days = Number.isFinite(requestedDays) && requestedDays > 0 ? Math.min(requestedDays, 365) : 30;

        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() - (days - 1));

        const rows = await analyticEventModel.aggregate([
            {$match:{store:store._id, occurredAt:{$gte:start}}},
            {$group:{
                _id:{$dateToString:{format:"%Y-%m-%d", date:"$occurredAt"}},
                value:{$sum:1}
            }}
        ])

        const byDate = new Map(rows.map(row=>[row._id, row.value]));

        // A zero filled series keeps the chart renderable on quiet days.
        const dailyVisits = [];

        for(let i = 0; i < days; i++){
            const day = new Date(start);
            day.setUTCDate(start.getUTCDate() + i);

            const date = day.toISOString().slice(0, 10);

            dailyVisits.push({
                date,
                visits:byDate.get(date) || 0
            })
        }

        const totalEvents = dailyVisits.reduce((sum, day)=>sum + day.visits, 0);

        const [returningCustomers, claimTotals, feedbackTotals] = await Promise.all([
            loyaltyCardModel.countDocuments({store:store._id, totalStampsEarned:{$gt:1}}),
            rewardClaimModel.aggregate([
                {$match:{store:store._id}},
                {$group:{
                    _id:null,
                    total:{$sum:1},
                    redeemed:{$sum:{$cond:[{$eq:["$status","REDEEMED"]}, 1, 0]}}
                }}
            ]),
            feedbackModel.aggregate([
                {$match:{store:store._id}},
                {$group:{_id:null, averageRating:{$avg:"$rating"}}}
            ])
        ])

        const claims = claimTotals.length ? claimTotals[0] : {total:0, redeemed:0};
        const rewardRedemptionRate = claims.total ? Math.round((claims.redeemed / claims.total) * 100) : 0;
        const feedbackScore = feedbackTotals.length ? Number(feedbackTotals[0].averageRating.toFixed(1)) : 0;

        return res.status(200).json({
            success:true,
            message:"Analytics fetched successfully",
            data:{
                analytics:{
                    dailyVisits,
                    totalEvents,
                    returningCustomers,
                    rewardRedemptionRate,
                    feedbackScore
                }
            }
        })
    }catch(error){
        console.error("getAnalytics error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch analytics"
        })
    }
}

// One call that fills the merchant home screen. Every number the desk wants to
// glance at is counted in parallel so the page stays quick.
const getDashboardSummary = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);

        const trendStart = new Date(startOfToday);
        trendStart.setDate(trendStart.getDate() - 6);

        const [
            storeCount,
            menuItemCount,
            ordersToday,
            ordersTotal,
            customers,
            newCustomers,
            feedbackCount,
            ratingTotals,
            openIssues,
            queueWaiting,
            rewards,
            activeClaims,
            giftCards,
            stampTotals,
            orderTotals,
            visitRows,
            orderRows
        ] = await Promise.all([
            storeModel.countDocuments({merchant:merchant._id}),
            menuItemModel.countDocuments({store:store._id}),
            orderModel.countDocuments({store:store._id, createdAt:{$gte:startOfToday}}),
            orderModel.countDocuments({store:store._id}),
            loyaltyCardModel.countDocuments({store:store._id}),
            loyaltyCardModel.countDocuments({store:store._id, createdAt:{$gte:startOfToday}}),
            feedbackModel.countDocuments({store:store._id}),
            feedbackModel.aggregate([
                {$match:{store:store._id}},
                {$group:{_id:null, averageRating:{$avg:"$rating"}}}
            ]),
            issueModel.countDocuments({store:store._id, status:{$in:["OPEN","IN_PROGRESS"]}}),
            queueEntryModel.countDocuments({store:store._id, status:{$in:["WAITING","CALLED"]}}),
            rewardModel.countDocuments({store:store._id, isActive:true}),
            rewardClaimModel.countDocuments({store:store._id, status:"ACTIVE"}),
            giftCardModel.countDocuments({store:store._id, status:"ACTIVE"}),
            loyaltyCardModel.aggregate([
                {$match:{store:store._id}},
                {$group:{_id:null, stamps:{$sum:"$totalStampsEarned"}}}
            ]),
            orderModel.aggregate([
                {$match:{store:store._id, status:{$ne:"CANCELLED"}}},
                {$group:{_id:null, revenue:{$sum:"$total"}, billed:{$sum:1}}}
            ]),
            analyticEventModel.aggregate([
                {$match:{store:store._id, occurredAt:{$gte:trendStart}}},
                {$group:{_id:{$dateToString:{format:"%Y-%m-%d", date:"$occurredAt"}}, visits:{$sum:1}}}
            ]),
            orderModel.aggregate([
                {$match:{store:store._id, createdAt:{$gte:trendStart}}},
                {$group:{_id:{$dateToString:{format:"%Y-%m-%d", date:"$createdAt"}}, orders:{$sum:1}}}
            ])
        ])

        const visitByDate = new Map(visitRows.map((row)=>[row._id, row.visits]));
        const orderByDate = new Map(orderRows.map((row)=>[row._id, row.orders]));

        // A zero filled week keeps the chart readable on quiet days.
        const trend = [];

        for(let i = 0; i < 7; i++){
            const day = new Date(trendStart);
            day.setDate(trendStart.getDate() + i);

            const date = day.toISOString().slice(0, 10);

            trend.push({
                date:date.slice(5),
                visits:visitByDate.get(date) || 0,
                orders:orderByDate.get(date) || 0
            })
        }

        const rating = ratingTotals.length ? Number(ratingTotals[0].averageRating.toFixed(1)) : 0;
        const stamps = stampTotals.length ? stampTotals[0].stamps : 0;
        const billed = orderTotals.length ? orderTotals[0].billed : 0;
        const revenue = orderTotals.length ? orderTotals[0].revenue : 0;

        return res.status(200).json({
            success:true,
            message:"Dashboard summary fetched successfully",
            data:{
                summary:{
                    storeName:store.name,
                    stores:storeCount,
                    menuItems:menuItemCount,
                    ordersToday,
                    ordersTotal,
                    ordersBilled:billed,
                    revenue,
                    customers,
                    newCustomers,
                    feedback:feedbackCount,
                    feedbackScore:rating,
                    openIssues,
                    queueWaiting,
                    rewards,
                    activeClaims,
                    giftCards,
                    stamps
                },
                trend
            }
        })
    }catch(error){
        console.error("getDashboardSummary error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch dashboard summary"
        })
    }
}

const listCampaigns = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const campaigns = await campaignModel.find({store:store._id})
            .sort({createdAt:-1})
            .limit(100)
            .lean()

        return res.status(200).json({
            success:true,
            message:"Campaigns fetched successfully",
            data:{campaigns}
        })
    }catch(error){
        console.error("listCampaigns error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch campaigns"
        })
    }
}

const createCampaign = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const {name, channel, audience, messageTemplate, scheduledAt} = req.body;

        if(!name?.trim() || !messageTemplate?.trim()){
            return res.status(400).json({
                success:false,
                message:"Campaign name and message template are required"
            })
        }

        const resolvedChannel = channel || "WHATSAPP";

        if(!CAMPAIGN_CHANNELS.includes(resolvedChannel)){
            return res.status(400).json({
                success:false,
                message:"Invalid campaign channel"
            })
        }

        const segment = audience?.segment || "ALL_CUSTOMERS";

        if(!CAMPAIGN_SEGMENTS.includes(segment)){
            return res.status(400).json({
                success:false,
                message:"Invalid audience segment"
            })
        }

        const campaign = await campaignModel.create({
            store:store._id,
            createdBy:req.user._id,
            name:name.trim(),
            channel:resolvedChannel,
            audience:{
                segment,
                inactiveDays:Number(audience?.inactiveDays) || 0,
                minimumVisits:Number(audience?.minimumVisits) || 0
            },
            messageTemplate,
            scheduledAt:scheduledAt ? new Date(scheduledAt) : null,
            status:scheduledAt ? "SCHEDULED" : "DRAFT"
        })

        return res.status(201).json({
            success:true,
            message:"Campaign created successfully",
            data:{campaign}
        })
    }catch(error){
        console.error("createCampaign error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to create campaign"
        })
    }
}

export {getCrmStats, getCrmCustomers, getCustomerProfile, getAnalytics, getDashboardSummary, listCampaigns, createCampaign};
