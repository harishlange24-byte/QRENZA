import mongoose from "mongoose";
import feedbackModel from "../models/feedback.model.js";
import issueModel from "../models/issue.model.js";
import { resolveMerchant, findOwnedStore, findPublicStore } from "../utils/access.js";

const FEEDBACK_CATEGORIES = [
    "PRODUCT",
    "SERVICE",
    "STAFF",
    "WAIT_TIME",
    "PRICE",
    "CLEANLINESS",
    "OTHER"
];

const ISSUE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const ISSUE_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const submitFeedback = async(req,res)=>{
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

        const {rating, category, comment, source} = req.body;

        const parsedRating = Number(rating);

        if(!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5){
            return res.status(400).json({
                success:false,
                message:"Rating must be a whole number between 1 and 5"
            })
        }

        if(category && !FEEDBACK_CATEGORIES.includes(category)){
            return res.status(400).json({
                success:false,
                message:"Invalid feedback category"
            })
        }

        const feedback = await feedbackModel.create({
            user:req.user._id,
            store:store._id,
            rating:parsedRating,
            category:category || "OTHER",
            comment:comment || "",
            source:source || "POST_VISIT"
        })

        let issueOpened = false;

        // A 1-2 star visit becomes a recovery issue the shop has to act on.
        if(parsedRating <= 2){
            try{
                await issueModel.create({
                    feedback:feedback._id,
                    user:req.user._id,
                    store:store._id,
                    title:`Low rating - ${feedback.category}`,
                    description:comment?.trim() || "Customer left a low rating without a comment",
                    category:feedback.category,
                    priority:parsedRating === 1 ? "URGENT" : "HIGH",
                    status:"OPEN"
                })
                issueOpened = true;
            }catch(error){
                // Issue.feedback is unique, a duplicate just means one already exists.
                if(error.code !== 11000){
                    throw error;
                }
            }
        }

        return res.status(201).json({
            success:true,
            message:"Feedback submitted successfully",
            data:{
                feedback,
                issueOpened
            }
        })
    }catch(error){
        console.error("submitFeedback error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to submit feedback"
        })
    }
}

const listFeedback = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const feedback = await feedbackModel.find({store:store._id})
            .sort({createdAt:-1})
            .limit(100)
            .populate("user","name phone")
            .lean()

        const summary = await feedbackModel.aggregate([
            {$match:{store:store._id}},
            {$group:{_id:null, averageRating:{$avg:"$rating"}, count:{$sum:1}}}
        ])

        const averageRating = summary.length ? Number(summary[0].averageRating.toFixed(2)) : 0;
        const count = summary.length ? summary[0].count : 0;

        return res.status(200).json({
            success:true,
            message:"Feedback fetched successfully",
            data:{
                feedback,
                averageRating,
                count
            }
        })
    }catch(error){
        console.error("listFeedback error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch feedback"
        })
    }
}

const listIssues = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const issues = await issueModel.find({store:store._id})
            .sort({createdAt:-1})
            .limit(100)
            .populate("user","name phone")
            .lean()

        return res.status(200).json({
            success:true,
            message:"Issues fetched successfully",
            data:{issues}
        })
    }catch(error){
        console.error("listIssues error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to fetch issues"
        })
    }
}

const respondIssue = async(req,res)=>{
    try{
        const merchant = await resolveMerchant(req.user);

        const store = await findOwnedStore(merchant, req.params.storeId);

        if(!store){
            return res.status(404).json({
                success:false,
                message:"Store not found"
            })
        }

        const {issueId} = req.params;

        if(!mongoose.isValidObjectId(issueId)){
            return res.status(400).json({
                success:false,
                message:"Invalid issue ID"
            })
        }

        const {status, resolutionNote, priority} = req.body;

        if(!status && !resolutionNote && !priority){
            return res.status(400).json({
                success:false,
                message:"Nothing to update"
            })
        }

        if(status && !ISSUE_STATUSES.includes(status)){
            return res.status(400).json({
                success:false,
                message:"Invalid issue status"
            })
        }

        if(priority && !ISSUE_PRIORITIES.includes(priority)){
            return res.status(400).json({
                success:false,
                message:"Invalid issue priority"
            })
        }

        const issue = await issueModel.findOne({
            _id:issueId,
            store:store._id
        })

        if(!issue){
            return res.status(404).json({
                success:false,
                message:"Issue not found"
            })
        }

        if(status){
            issue.status = status;

            if(status === "RESOLVED"){
                issue.resolvedAt = new Date();
            }
        }

        if(resolutionNote !== undefined){
            issue.resolutionNote = resolutionNote;
        }

        if(priority){
            issue.priority = priority;
        }

        await issue.save();

        return res.status(200).json({
            success:true,
            message:"Issue updated successfully",
            data:{issue}
        })
    }catch(error){
        console.error("respondIssue error : ",error);
        return res.status(500).json({
            success:false,
            message:"Unable to update issue"
        })
    }
}

export {submitFeedback, listFeedback, listIssues, respondIssue};
