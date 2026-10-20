import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/merchant.middleware.js";
import {
  listPlansAdmin,
  createPlan,
  updatePlan,
  listSubscriptions,
  adminActivateSubscription,
  listPayments,
  listRefunds,
  reviewRefund,
  submitRefund,
  listPlanChanges,
  reviewPlanChange,
  listAuditLogs
} from "../controllers/billingAdmin.controller.js";

const router = express.Router();

// Platform billing administration is never reachable through public registration.
router.use(protect, authorize("SUPER_ADMIN"));

router.get("/plans", listPlansAdmin);
router.post("/plans", createPlan);
router.patch("/plans/:code", updatePlan);

router.get("/subscriptions", listSubscriptions);
router.post("/subscriptions/activate", adminActivateSubscription);

router.get("/payments", listPayments);

router.get("/refunds", listRefunds);
router.patch("/refunds/:id", reviewRefund);
router.post("/refunds/:id/submit", submitRefund);

router.get("/plan-changes", listPlanChanges);
router.patch("/plan-changes/:id", reviewPlanChange);

router.get("/audit-logs", listAuditLogs);

export default router;
