import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/merchant.middleware.js";
import {
  createCheckout,
  verifyCheckout,
  handleWebhook,
  cancelRenewal,
  requestRefund,
  requestPlanChange,
  requestEnterpriseQuote
} from "../controllers/billing.controller.js";

const router = express.Router();

// The webhook is unauthenticated by design and is protected by the provider
// signature check inside the handler.
router.post("/webhook", handleWebhook);

router.post("/checkout", protect, authorize("MERCHANT"), createCheckout);
router.post("/verify", protect, authorize("MERCHANT"), verifyCheckout);
router.post("/cancel", protect, authorize("MERCHANT"), cancelRenewal);
router.post("/plan-change", protect, authorize("MERCHANT"), requestPlanChange);
router.post("/enterprise", protect, authorize("MERCHANT"), requestEnterpriseQuote);
router.post("/refunds", protect, authorize("MERCHANT"), requestRefund);

export default router;
