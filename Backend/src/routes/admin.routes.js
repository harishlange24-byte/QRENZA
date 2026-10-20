import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/merchant.middleware.js";
import {
    getOverview,
    listMerchants,
    getMerchantDetail,
    updateMerchant,
    listStores,
    updateStore,
    listUsers,
    updateUser,
    getAlerts,
    listAuditLogs
} from "../controllers/admin.controller.js";

const router = express.Router();

// Platform administration is never reachable through public registration.
router.use(protect, authorize("SUPER_ADMIN"));

router.get("/overview", getOverview);

router.get("/merchants", listMerchants);
router.get("/merchants/:id", getMerchantDetail);
router.patch("/merchants/:id", updateMerchant);

router.get("/stores", listStores);
router.patch("/stores/:id", updateStore);

router.get("/users", listUsers);
router.patch("/users/:id", updateUser);

router.get("/alerts", getAlerts);
router.get("/audit-logs", listAuditLogs);

export default router;
