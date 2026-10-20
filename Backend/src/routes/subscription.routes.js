import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/merchant.middleware.js";
import {
  getMySubscription,
  getSubscriptionHistory,
  startTrialHandler,
  getLimits
} from "../controllers/subscription.controller.js";

const router = express.Router();

router.get("/me", protect, getMySubscription);
router.get("/history", protect, getSubscriptionHistory);
router.get("/limits", protect, getLimits);
router.post("/trial", protect, authorize("MERCHANT"), startTrialHandler);

export default router;
