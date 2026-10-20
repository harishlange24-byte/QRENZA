import mongoose from "mongoose";
import queueModel from "../models/queue.model.js";
import queueEntryModel from "../models/queueEntry.model.js";
import {resolveMerchant, findOwnedStore, findPublicStore} from "../utils/access.js";
import {emitQueueUpdate} from "../realtime.js";

const startOfDay = ()=>{
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
}

// One queue document exists per store per day. Create it on demand and survive
// the race where two requests create it at the same time.
const findOrCreateQueue = async(store)=>{
    const serviceDate = startOfDay();

    const existing = await queueModel.findOne({
        store:store._id,
        serviceDate
    });

    if(existing){
        return existing;
    }

    try{
        return await queueModel.create({
            store:store._id,
            serviceDate
        });
    }catch(error){
        if(error.code === 11000){
            return queueModel.findOne({
                store:store._id,
                serviceDate
            });
        }
        throw error;
    }
}

// People still waiting ahead of the given token.
const countPeopleAhead = async(queueId,tokenNumber)=>{
    return queueEntryModel.countDocuments({
        queue:queueId,
        status:"WAITING",
        tokenNumber:{$lt:tokenNumber}
    });
}

// Resolve the logged in customer, otherwise fall back to the phone the guest
// supplied. Guests have no session, so user is null on their entry.
const resolveCaller = (req)=>{
    const user = req.user?._id || null;
    const phone = String(req.body?.phone || req.query?.phone || "").trim();

    return {user,phone};
}

const joinQueue = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            });
        }

        const {customerName, customerPhone} = req.body;

        if(!customerName?.trim() || !customerPhone?.trim()){
            return res.status(400).json({
                success:false,
                message:"Customer name and phone are required"
            });
        }

        const name = customerName.trim();
        const phone = customerPhone.trim();
        const {user} = resolveCaller(req);

        const queue = await findOrCreateQueue(store);

        // Reuse the caller's active entry instead of handing them a second token.
        const activeEntry = await queueEntryModel.findOne({
            queue:queue._id,
            status:{$in:["WAITING","CALLED"]},
            ...(user ? {user} : {customerPhone:phone})
        });

        if(activeEntry){
            const peopleAhead = await countPeopleAhead(queue._id,activeEntry.tokenNumber);

            return res.status(200).json({
                success:true,
                message:"You are already in the queue",
                data:{entry:{
                    tokenNumber:activeEntry.tokenNumber,
                    status:activeEntry.status,
                    positionAtJoin:activeEntry.positionAtJoin,
                    estimatedWaitMinutes:peopleAhead * queue.averageServiceMinutes,
                    peopleAhead
                }}
            });
        }

        // Atomic increment so two customers can never get the same token.
        const updatedQueue = await queueModel.findOneAndUpdate(
            {_id:queue._id},
            {$inc:{lastIssuedToken:1}},
            {returnDocument:"after"}
        );

        const tokenNumber = updatedQueue.lastIssuedToken;
        const peopleAhead = await countPeopleAhead(queue._id,tokenNumber);

        const entry = await queueEntryModel.create({
            queue:queue._id,
            store:store._id,
            user,
            customerName:name,
            customerPhone:phone,
            tokenNumber,
            status:"WAITING",
            positionAtJoin:peopleAhead + 1,
            estimatedWaitMinutes:peopleAhead * queue.averageServiceMinutes,
            joinedAt:new Date()
        });

        emitQueueUpdate(store._id,store.publicCode);

        return res.status(201).json({
            success:true,
            message:"Joined the queue successfully",
            data:{entry:{
                tokenNumber:entry.tokenNumber,
                status:entry.status,
                positionAtJoin:entry.positionAtJoin,
                estimatedWaitMinutes:entry.estimatedWaitMinutes,
                peopleAhead
            }}
        });
    }catch(error){
        console.error("joinQueue error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to join the queue"
        });
    }
}

const getMyQueue = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            });
        }

        const queue = await queueModel.findOne({
            store:store._id,
            serviceDate:startOfDay()
        });

        if(!queue){
            return res.status(200).json({
                success:true,
                message:"You are not in the queue",
                data:{entry:null}
            });
        }

        const {user,phone} = resolveCaller(req);

        // Guests have no session, so they are only matched when they pass a phone.
        const filter = {
            queue:queue._id,
            status:{$in:["WAITING","CALLED","SERVING"]}
        };

        if(user){
            filter.user = user;
        }else if(phone){
            filter.customerPhone = phone;
        }else{
            return res.status(200).json({
                success:true,
                message:"You are not in the queue",
                data:{entry:null}
            });
        }

        const entry = await queueEntryModel.findOne(filter).sort({tokenNumber:1});

        if(!entry){
            return res.status(200).json({
                success:true,
                message:"You are not in the queue",
                data:{entry:null}
            });
        }

        const peopleAhead = await countPeopleAhead(queue._id,entry.tokenNumber);

        return res.status(200).json({
            success:true,
            message:"Queue entry found",
            data:{entry:{
                _id:entry._id,
                tokenNumber:entry.tokenNumber,
                status:entry.status,
                positionAtJoin:entry.positionAtJoin,
                peopleAhead,
                estimatedWaitMinutes:peopleAhead * queue.averageServiceMinutes
            }}
        });
    }catch(error){
        console.error("getMyQueue error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch queue entry"
        });
    }
}

const getMerchantQueue = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found for this merchant"
            });
        }

        const queue = await findOrCreateQueue(store);

        const entries = await queueEntryModel.find({
            queue:queue._id,
            status:{$in:["WAITING","CALLED","SERVING"]}
        }).sort({tokenNumber:1});

        const waiting = await queueEntryModel.countDocuments({
            queue:queue._id,
            status:"WAITING"
        });

        const servedToday = await queueEntryModel.countDocuments({
            queue:queue._id,
            status:"SERVED"
        });

        let nowServing = null;

        if(queue.currentServingEntry){
            nowServing = entries.find(
                (entry)=>String(entry._id) === String(queue.currentServingEntry)
            ) || null;
        }

        if(!nowServing){
            nowServing = await queueEntryModel.findOne({
                queue:queue._id,
                status:{$in:["CALLED","SERVING"]}
            }).sort({tokenNumber:-1});
        }

        return res.status(200).json({
            success:true,
            message:"Queue fetched successfully",
            data:{queue:{
                _id:queue._id,
                serviceDate:queue.serviceDate,
                status:queue.status,
                averageServiceMinutes:queue.averageServiceMinutes,
                lastIssuedToken:queue.lastIssuedToken,
                lastServedToken:queue.lastServedToken,
                nowServing,
                entries,
                counts:{
                    waiting,
                    servedToday
                }
            }}
        });
    }catch(error){
        console.error("getMerchantQueue error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch the queue"
        });
    }
}

const callNext = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found for this merchant"
            });
        }

        const queue = await findOrCreateQueue(store);

        const entry = await queueEntryModel.findOne({
            queue:queue._id,
            status:"WAITING"
        }).sort({tokenNumber:1});

        if(!entry){
            return res.status(200).json({
                success:true,
                message:"Queue is empty",
                data:{entry:null}
            });
        }

        entry.status = "CALLED";
        entry.calledAt = new Date();
        await entry.save();

        queue.currentServingEntry = entry._id;
        queue.lastServedToken = entry.tokenNumber;
        await queue.save();

        emitQueueUpdate(store._id,store.publicCode);

        return res.status(200).json({
            success:true,
            message:"Next customer called",
            data:{entry}
        });
    }catch(error){
        console.error("callNext error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to call the next customer"
        });
    }
}

const skipEntry = async(req,res)=>{
    try{
        const {entryId} = req.params;

        if(!mongoose.isValidObjectId(entryId)){
            return res.status(400).json({
                success:false,
                message:"Invalid entry ID"
            });
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found for this merchant"
            });
        }

        const queue = await findOrCreateQueue(store);

        const entry = await queueEntryModel.findOne({
            _id:entryId,
            store:store._id,
            queue:queue._id
        });

        if(!entry){
            return res.status(404).json({
                success:false,
                message:"Queue entry not found"
            });
        }

        if(["SERVED","SKIPPED","CANCELLED"].includes(entry.status)){
            return res.status(409).json({
                success:false,
                message:"This entry is already closed"
            });
        }

        entry.status = "SKIPPED";
        await entry.save();

        if(String(queue.currentServingEntry) === String(entry._id)){
            queue.currentServingEntry = null;
            await queue.save();
        }

        emitQueueUpdate(store._id,store.publicCode);

        return res.status(200).json({
            success:true,
            message:"Entry skipped",
            data:{entry}
        });
    }catch(error){
        console.error("skipEntry error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to skip the entry"
        });
    }
}

const serveEntry = async(req,res)=>{
    try{
        const {entryId} = req.params;

        if(!mongoose.isValidObjectId(entryId)){
            return res.status(400).json({
                success:false,
                message:"Invalid entry ID"
            });
        }

        const merchant = await resolveMerchant(req.user);
        const store = await findOwnedStore(merchant,req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found for this merchant"
            });
        }

        const queue = await findOrCreateQueue(store);

        const entry = await queueEntryModel.findOne({
            _id:entryId,
            store:store._id,
            queue:queue._id
        });

        if(!entry){
            return res.status(404).json({
                success:false,
                message:"Queue entry not found"
            });
        }

        if(["SERVED","SKIPPED","CANCELLED"].includes(entry.status)){
            return res.status(409).json({
                success:false,
                message:"This entry is already closed"
            });
        }

        entry.status = "SERVED";
        entry.servedAt = new Date();
        await entry.save();

        queue.lastServedToken = entry.tokenNumber;
        queue.currentServingEntry = null;
        await queue.save();

        emitQueueUpdate(store._id,store.publicCode);

        return res.status(200).json({
            success:true,
            message:"Entry served",
            data:{entry}
        });
    }catch(error){
        console.error("serveEntry error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to mark the entry as served"
        });
    }
}

const cancelEntry = async(req,res)=>{
    try{
        const store = await findPublicStore(req.params.code);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found or inactive"
            });
        }

        const queue = await queueModel.findOne({
            store:store._id,
            serviceDate:startOfDay()
        });

        const {user,phone} = resolveCaller(req);

        const filter = {
            queue:queue?._id,
            status:{$in:["WAITING","CALLED","SERVING"]}
        };

        if(user){
            filter.user = user;
        }else if(phone){
            filter.customerPhone = phone;
        }else{
            return res.status(404).json({
                success:false,
                message:"No active queue entry found"
            });
        }

        const entry = queue ? await queueEntryModel.findOne(filter).sort({tokenNumber:1}) : null;

        if(!entry){
            return res.status(404).json({
                success:false,
                message:"No active queue entry found"
            });
        }

        entry.status = "CANCELLED";
        entry.cancelledAt = new Date();
        await entry.save();

        if(String(queue.currentServingEntry) === String(entry._id)){
            queue.currentServingEntry = null;
            await queue.save();
        }

        emitQueueUpdate(store._id,store.publicCode);

        return res.status(200).json({
            success:true,
            message:"Entry cancelled",
            data:{entry}
        });
    }catch(error){
        console.error("cancelEntry error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to cancel the queue entry"
        });
    }
}

export {joinQueue, getMyQueue, getMerchantQueue, callNext, skipEntry, serveEntry, cancelEntry};
