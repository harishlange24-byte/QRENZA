import express from "express";
import {protect, optionalProtect} from "../middleware/auth.middleware.js";
import {authorize} from "../middleware/merchant.middleware.js";
import {requireFeature} from "../middleware/feature.middleware.js";
import {
    createStore,
    listStores,
    getPublicStoreByCode,
    getPublicTable,
    getStoreQR
} from "../controllers/store.controller.js";
import {
    getPublicMenu,
    getMerchantMenu,
    createCategory,
    createItem,
    updateItem
} from "../controllers/menu.controller.js";
import {
    getMyLoyalty,
    addStamp,
    getLoyaltyProgram,
    upsertLoyaltyProgram,
    scratchReward,
    getMyRewards,
    listRewards,
    createReward,
    redeemClaim
} from "../controllers/loyalty.controller.js";
import {
    joinQueue,
    getMyQueue,
    getMerchantQueue,
    callNext,
    skipEntry,
    serveEntry,
    cancelEntry
} from "../controllers/queue.controller.js";
import {
    submitFeedback,
    listFeedback,
    listIssues,
    respondIssue
} from "../controllers/feedback.controller.js";
import {
    getCrmStats,
    getCrmCustomers,
    getCustomerProfile,
    getAnalytics,
    listCampaigns,
    createCampaign
} from "../controllers/crm.controller.js";
import {listStaff, addStaff} from "../controllers/staff.controller.js";
import {
    placeOrder,
    getMyOrders,
    cancelOrder,
    listStoreOrders,
    updateOrderStatus
} from "../controllers/order.controller.js";
import {
    recordVisit,
    getMyGiftCards,
    listStoreGiftCards,
    createGiftCard
} from "../controllers/giftCard.controller.js";
import {
    listSupplyCatalog,
    createSupplyOrder,
    listSupplyOrders,
    cancelSupplyOrder
} from "../controllers/supply.controller.js";

const router  = express.Router();

// Customer routes are keyed by the public store code and stay in front so
// "/public/..." is never swallowed by the "/:storeId/..." routes below.
router.get("/public/:code",getPublicStoreByCode);
router.get("/public/:code/t/:tableNumber",getPublicTable);
router.get("/public/:code/menu",getPublicMenu);

router.post("/public/:code/feedback",protect,submitFeedback);
router.get("/public/:code/loyalty",protect,getMyLoyalty);
router.post("/public/:code/scratch",protect,scratchReward);
router.get("/public/:code/rewards",protect,getMyRewards);

// Queue is also used by walk in guests, so the session is optional here.
router.post("/public/:code/queue/join",optionalProtect,joinQueue);
router.get("/public/:code/queue/me",optionalProtect,getMyQueue);
router.post("/public/:code/queue/cancel",optionalProtect,cancelEntry);

// Table ordering works for guests too, the phone identifies their own orders.
router.post("/public/:code/orders",optionalProtect,placeOrder);
router.get("/public/:code/orders",optionalProtect,getMyOrders);
router.post("/public/:code/orders/:orderId/cancel",optionalProtect,cancelOrder);

// Visit streak and gift cards belong to a logged in customer.
router.post("/public/:code/visit",protect,recordVisit);
router.get("/public/:code/gift-cards",protect,getMyGiftCards);

router.post("/",protect,authorize("MERCHANT"),createStore);
router.get("/",protect,authorize("MERCHANT"),listStores);
router.get("/:storeId/qr",protect,authorize("MERCHANT"),getStoreQR);

// Physical supplies (QR standee and friends) are bought by the merchant, so
// these live outside the store scoped routes.
router.get("/supplies",protect,authorize("MERCHANT"),listSupplyCatalog);
router.get("/supplies/orders",protect,authorize("MERCHANT"),listSupplyOrders);
router.post("/supplies/orders",protect,authorize("MERCHANT"),createSupplyOrder);
router.post("/supplies/orders/:orderId/cancel",protect,authorize("MERCHANT"),cancelSupplyOrder);

router.get("/:storeId/menu",protect,authorize("MERCHANT","STAFF"),requireFeature("AI_MENU"),getMerchantMenu);
router.post("/:storeId/menu/categories",protect,authorize("MERCHANT","STAFF"),requireFeature("AI_MENU"),createCategory);
router.post("/:storeId/menu/items",protect,authorize("MERCHANT","STAFF"),requireFeature("AI_MENU"),createItem);
router.patch("/:storeId/menu/items/:itemId",protect,authorize("MERCHANT","STAFF"),requireFeature("AI_MENU"),updateItem);

router.get("/:storeId/loyalty",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),getLoyaltyProgram);
router.put("/:storeId/loyalty",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),upsertLoyaltyProgram);
router.post("/:storeId/loyalty/stamps",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),addStamp);

router.get("/:storeId/rewards",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),listRewards);
router.post("/:storeId/rewards",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),createReward);
router.post("/:storeId/rewards/redeem",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),redeemClaim);

router.get("/:storeId/queue",protect,authorize("MERCHANT","STAFF"),requireFeature("QR_QUEUE"),getMerchantQueue);
router.post("/:storeId/queue/next",protect,authorize("MERCHANT","STAFF"),requireFeature("QR_QUEUE"),callNext);
router.post("/:storeId/queue/:entryId/skip",protect,authorize("MERCHANT","STAFF"),requireFeature("QR_QUEUE"),skipEntry);
router.post("/:storeId/queue/:entryId/serve",protect,authorize("MERCHANT","STAFF"),requireFeature("QR_QUEUE"),serveEntry);

router.get("/:storeId/feedback",protect,authorize("MERCHANT","STAFF"),requireFeature("FEEDBACK_INBOX"),listFeedback);
router.get("/:storeId/issues",protect,authorize("MERCHANT","STAFF"),requireFeature("FEEDBACK_INBOX"),listIssues);
router.patch("/:storeId/issues/:issueId",protect,authorize("MERCHANT","STAFF"),requireFeature("FEEDBACK_INBOX"),respondIssue);

router.get("/:storeId/crm",protect,authorize("MERCHANT","STAFF"),requireFeature("CUSTOMER_CRM"),getCrmStats);
router.get("/:storeId/crm/customers",protect,authorize("MERCHANT","STAFF"),requireFeature("CUSTOMER_CRM"),getCrmCustomers);
router.get("/:storeId/crm/customers/:userId",protect,authorize("MERCHANT","STAFF"),requireFeature("CUSTOMER_CRM"),getCustomerProfile);

router.get("/:storeId/analytics",protect,authorize("MERCHANT","STAFF"),requireFeature("ANALYTICS"),getAnalytics);
router.get("/:storeId/campaigns",protect,authorize("MERCHANT","STAFF"),requireFeature("WHATSAPP_CAMPAIGNS"),listCampaigns);
router.post("/:storeId/campaigns",protect,authorize("MERCHANT","STAFF"),requireFeature("WHATSAPP_CAMPAIGNS"),createCampaign);

router.get("/:storeId/staff",protect,authorize("MERCHANT","STAFF"),requireFeature("STAFF_ACCOUNTS"),listStaff);
router.post("/:storeId/staff",protect,authorize("MERCHANT","STAFF"),requireFeature("STAFF_ACCOUNTS"),addStaff);

router.get("/:storeId/orders",protect,authorize("MERCHANT","STAFF"),requireFeature("ONLINE_ORDERING"),listStoreOrders);
router.patch("/:storeId/orders/:orderId",protect,authorize("MERCHANT","STAFF"),requireFeature("ONLINE_ORDERING"),updateOrderStatus);

router.get("/:storeId/gift-cards",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),listStoreGiftCards);
router.post("/:storeId/gift-cards",protect,authorize("MERCHANT","STAFF"),requireFeature("DIGITAL_STAMPS"),createGiftCard);

export default router;
