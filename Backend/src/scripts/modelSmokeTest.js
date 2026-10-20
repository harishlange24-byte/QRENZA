import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import "../models/index.js";

const expectedModels = [
  "User",
  "Merchant",
  "Staff",
  "Store",
  "Table",
  "QRCode",
  "Menu",
  "MenuCategory",
  "MenuItem",
  "LoyaltyProgram",
  "LoyaltyCard",
  "LoyaltyTransaction",
  "Reward",
  "RewardClaim",
  "Queue",
  "QueueEntry",
  "Feedback",
  "Issue",
  "Campaign",
  "CampaignRecipient",
  "WhatsAppMessage",
  "Coupon",
  "Notification",
  "AuditLog",
  "AnalyticsEvent",
  "Plan",
  "Subscription",
  "PaymentTransaction",
  "WebhookEvent",
  "PlanChangeRequest",
  "RefundRequest"
];


const runTest = async()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);

        const registeredModels = mongoose.modelNames();

        const missingModels = expectedModels.filter(
            (model)=> !registeredModels.includes(model)
        );

        if(missingModels.length > 0){
            console.log("Missing Models : ", missingModels);
            process.exitCode = 1;
            return;
        }

        console.log("==================================");
        console.log("QRENZA MODEL SMOKE TEST PASSED");
        console.log("==================================");
        console.log(`Models registered : ${expectedModels.length}`);

        expectedModels.forEach((model)=>{
            console.log(` ${model}`);
        })



    }catch(err){
        console.error("Model Smoke test failed");
        console.error(error.message);
        process.exitCode = 1;
    }finally{
        await mongoose.disconnect();
    }
};
runTest();