import Merchant from "../models/merchant.model.js";
import Store from "../models/store.model.js";
import User from "../models/user.model.js";
import Menu from "../models/menu.model.js";
import MenuCategory from "../models/menuCategory.model.js";
import MenuItem from "../models/menuItem.model.js";
import Table from "../models/table.model.js";
import LoyaltyProgram from "../models/loyaltyProgram.model.js";
import Subscription from "../models/subscription.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import RefundRequest from "../models/refundRequest.model.js";
import PlanChangeRequest from "../models/planChangeRequest.model.js";
import AuditLog from "../models/auditLog.model.js";
import LoyaltyCard from "../models/loyaltyCard.model.js";
import QueueEntry from "../models/queueEntry.model.js";
import Feedback from "../models/feedback.model.js";
import Issue from "../models/issue.model.js";

import { recordAudit } from "../utils/audit.js";

// A paid transaction still counts as collected even after a refund is applied,
// because the provider did capture the money. Refunded totals are reported
// separately in the revenue block.
const COLLECTED_PAYMENT_STATUSES = ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"];
const USER_ROLES = ["CUSTOMER", "MERCHANT", "STAFF", "SUPER_ADMIN"];
const ALERT_LIMIT = 50;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePaging = (query) => {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    return { page, limit, skip: (page - 1) * limit };
};

const sumFromFacet = (rows, key) => (rows?.[0]?.[key]?.[0]?.total) || 0;

// A store's catalogue only exists for that store, so it goes with it. Orders,
// loyalty cards, gift cards and feedback stay behind as history.
const purgeStore = async (storeId) => {
    const menu = await Menu.findOne({ store: storeId }).select("_id").lean();

    if (menu) {
        await MenuItem.deleteMany({ menu: menu._id });
        await MenuCategory.deleteMany({ menu: menu._id });
        await Menu.deleteOne({ _id: menu._id });
    }

    await Table.deleteMany({ store: storeId });
    await LoyaltyProgram.deleteMany({ store: storeId });
    await Store.deleteOne({ _id: storeId });
};

// Platform wide dashboard counters. Everything is batched with Promise.all so a
// single screen load never turns into a cascade of sequential queries.
const getOverview = async (req, res) => {
    try {
        const now = new Date();
        const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalMerchants,
            activeMerchants,
            totalStores,
            activeStores,
            totalUsers,
            totalStaff,
            totalCustomersWithCards,
            subscriptionsByStatus,
            planDistribution,
            revenueRows,
            pendingRefundRequests,
            trialsEndingSoon,
            pastDue,
            expired,
            paymentPending,
            pendingPlanChanges,
            openIssues,
            recentNewMerchants,
            recentNewPayments
        ] = await Promise.all([
            Merchant.countDocuments({}),
            Merchant.countDocuments({ status: "ACTIVE" }),
            Store.countDocuments({}),
            Store.countDocuments({ status: "ACTIVE" }),
            User.countDocuments({ role: "CUSTOMER" }),
            User.countDocuments({ role: "STAFF" }),
            LoyaltyCard.countDocuments({}),
            Subscription.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
            Subscription.aggregate([
                { $match: { isCurrent: true } },
                { $group: { _id: "$planCode", count: { $sum: 1 } } },
                { $project: { _id: 0, planCode: "$_id", count: 1 } },
                { $sort: { count: -1 } }
            ]),
            PaymentTransaction.aggregate([
                {
                    $facet: {
                        totalCollected: [
                            { $match: { status: { $in: COLLECTED_PAYMENT_STATUSES } } },
                            { $group: { _id: null, total: { $sum: "$amount" } } }
                        ],
                        collectedThisMonth: [
                            { $match: { status: { $in: COLLECTED_PAYMENT_STATUSES }, createdAt: { $gte: monthStart } } },
                            { $group: { _id: null, total: { $sum: "$amount" } } }
                        ],
                        totalRefunded: [{ $group: { _id: null, total: { $sum: "$refundAmount" } } }]
                    }
                }
            ]),
            RefundRequest.countDocuments({ status: "PENDING" }),
            Subscription.countDocuments({ status: "TRIALING", trialEnd: { $gte: now, $lte: soon } }),
            Subscription.countDocuments({ status: "PAST_DUE" }),
            Subscription.countDocuments({ status: "EXPIRED" }),
            Subscription.countDocuments({ status: "PAYMENT_PENDING" }),
            PlanChangeRequest.countDocuments({ status: "PENDING" }),
            Issue.countDocuments({ status: { $nin: ["RESOLVED", "CLOSED"] } }),
            Merchant.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
            PaymentTransaction.countDocuments({ status: { $in: COLLECTED_PAYMENT_STATUSES }, createdAt: { $gte: sevenDaysAgo } })
        ]);

        const statusCounts = {};
        subscriptionsByStatus.forEach((row) => {
            statusCounts[row._id] = row.count;
        });

        return res.status(200).json({
            success: true,
            data: {
                totals: {
                    totalMerchants,
                    activeMerchants,
                    totalStores,
                    activeStores,
                    totalUsers,
                    totalStaff,
                    totalCustomersWithCards
                },
                subscriptionsByStatus: statusCounts,
                planDistribution,
                revenue: {
                    totalCollected: sumFromFacet(revenueRows, "totalCollected"),
                    collectedThisMonth: sumFromFacet(revenueRows, "collectedThisMonth"),
                    totalRefunded: sumFromFacet(revenueRows, "totalRefunded"),
                    pendingRefundRequests
                },
                attention: {
                    trialsEndingSoon,
                    pastDue,
                    expired,
                    paymentPending,
                    pendingPlanChanges,
                    openIssues
                },
                recent: {
                    newMerchants: recentNewMerchants,
                    newPayments: recentNewPayments
                }
            }
        });
    } catch (error) {
        console.error("getOverview error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load platform overview" });
    }
};

// Merchant directory with store counts and current subscription resolved in a
// couple of batch queries instead of one round trip per row.
const listMerchants = async (req, res) => {
    try {
        const { page, limit, skip } = parsePaging(req.query);

        const query = {};
        if (req.query.status) query.status = String(req.query.status).toUpperCase();
        if (req.query.search) {
            const search = new RegExp(escapeRegex(String(req.query.search).trim()), "i");
            query.$or = [{ businessName: search }, { contactEmail: search }, { contactPhone: search }];
        }
        if (req.query.planCode) {
            const planCode = String(req.query.planCode).toUpperCase();
            const merchantIds = await Subscription.distinct("merchant", { isCurrent: true, planCode });
            query._id = { $in: merchantIds };
        }

        const [merchants, total] = await Promise.all([
            Merchant.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("owner", "phone")
                .lean(),
            Merchant.countDocuments(query)
        ]);

        const merchantIds = merchants.map((merchant) => merchant._id);
        const [storeCounts, subscriptions] = await Promise.all([
            Store.aggregate([
                { $match: { merchant: { $in: merchantIds } } },
                { $group: { _id: "$merchant", count: { $sum: 1 } } }
            ]),
            Subscription.find({ merchant: { $in: merchantIds }, isCurrent: true }).select("merchant planCode status").lean()
        ]);

        const storeCountByMerchant = new Map(storeCounts.map((row) => [String(row._id), row.count]));
        const subscriptionByMerchant = new Map(subscriptions.map((subscription) => [String(subscription.merchant), subscription]));

        const rows = merchants.map((merchant) => {
            const subscription = subscriptionByMerchant.get(String(merchant._id));
            return {
                _id: merchant._id,
                businessName: merchant.businessName,
                businessType: merchant.businessType,
                status: merchant.status,
                contactEmail: merchant.contactEmail,
                contactPhone: merchant.contactPhone,
                createdAt: merchant.createdAt,
                ownerPhone: merchant.owner?.phone || "",
                planCode: subscription?.planCode || "",
                subscriptionStatus: subscription?.status || "",
                storeCount: storeCountByMerchant.get(String(merchant._id)) || 0
            };
        });

        return res.status(200).json({ success: true, data: { merchants: rows, page, limit, total } });
    } catch (error) {
        console.error("listMerchants error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load merchants" });
    }
};

const getMerchantDetail = async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.params.id).lean();
        if (!merchant) {
            return res.status(404).json({ success: false, message: "Merchant not found" });
        }

        const [owner, stores, subscription] = await Promise.all([
            User.findById(merchant.owner).select("phone role isActive lastLoginAt").lean(),
            Store.find({ merchant: merchant._id }).select("name status publicCode createdAt").lean(),
            Subscription.findOne({ merchant: merchant._id, isCurrent: true })
                .select("planCode status trialEnd currentPeriodEnd totalPaidAmount")
                .lean()
        ]);

        const storeIds = stores.map((store) => store._id);

        const [recentPayments, recentAuditLogs, loyaltyCards, queueEntries, feedbackCount] = await Promise.all([
            PaymentTransaction.find({ merchant: merchant._id })
                .sort({ createdAt: -1 })
                .limit(10)
                .select("amount currency status planCode purpose createdAt")
                .lean(),
            AuditLog.find({ merchant: merchant._id })
                .sort({ createdAt: -1 })
                .limit(10)
                .select("action entityType entityId details createdAt")
                .populate("actor", "phone")
                .lean(),
            LoyaltyCard.countDocuments({ store: { $in: storeIds } }),
            QueueEntry.countDocuments({ store: { $in: storeIds } }),
            Feedback.countDocuments({ store: { $in: storeIds } })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                merchant,
                owner: owner || null,
                stores,
                subscription: subscription || null,
                recentPayments,
                recentAuditLogs,
                usage: { loyaltyCards, queueEntries, feedback: feedbackCount }
            }
        });
    } catch (error) {
        console.error("getMerchantDetail error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load merchant detail" });
    }
};

// A super admin can rename a merchant, fix its contact details and switch it
// off. Only the keys that were sent are changed.
const updateMerchant = async (req, res) => {
    try {
        const { status, businessName, contactEmail, contactPhone, note } = req.body || {};

        const merchant = await Merchant.findById(req.params.id);
        if (!merchant) {
            return res.status(404).json({ success: false, message: "Merchant not found" });
        }

        const from = {
            status: merchant.status,
            businessName: merchant.businessName,
            contactEmail: merchant.contactEmail,
            contactPhone: merchant.contactPhone
        };

        if (status !== undefined) {
            const nextStatus = String(status).toUpperCase();

            if (!Merchant.schema.path("status").enumValues.includes(nextStatus)) {
                return res.status(400).json({ success: false, message: "status must be ACTIVE or SUSPENDED" });
            }

            merchant.status = nextStatus;
        }

        if (businessName !== undefined) {
            if (!String(businessName).trim()) {
                return res.status(400).json({ success: false, message: "Business name cannot be empty" });
            }
            merchant.businessName = String(businessName).trim();
        }

        if (contactEmail !== undefined) {
            const email = String(contactEmail).trim().toLowerCase();

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return res.status(400).json({ success: false, message: "Enter a valid contact email" });
            }
            merchant.contactEmail = email;
        }

        if (contactPhone !== undefined) {
            if (!String(contactPhone).trim()) {
                return res.status(400).json({ success: false, message: "Contact phone cannot be empty" });
            }
            merchant.contactPhone = String(contactPhone).trim();
        }

        await merchant.save();

        await recordAudit(req, {
            action: "MERCHANT_UPDATED",
            entityType: "Merchant",
            entityId: merchant._id,
            merchant: merchant._id,
            details: {
                from,
                to: {
                    status: merchant.status,
                    businessName: merchant.businessName,
                    contactEmail: merchant.contactEmail,
                    contactPhone: merchant.contactPhone
                },
                note: String(note || "").slice(0, 1000)
            }
        });

        return res.status(200).json({ success: true, message: "Merchant updated", data: { merchant } });
    } catch (error) {
        console.error("updateMerchant error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to update merchant" });
    }
};

// Removing a merchant also removes the locations that only exist for it (with
// their menus and tables). Billing history is kept for the audit trail.
const deleteMerchant = async (req, res) => {
    try {
        const merchant = await Merchant.findById(req.params.id);

        if (!merchant) {
            return res.status(404).json({ success: false, message: "Merchant not found" });
        }

        const stores = await Store.find({ merchant: merchant._id }).select("_id").lean();

        for (const store of stores) {
            await purgeStore(store._id);
        }

        await recordAudit(req, {
            action: "MERCHANT_DELETED",
            entityType: "Merchant",
            entityId: merchant._id,
            details: { businessName: merchant.businessName, storesRemoved: stores.length }
        });

        await Merchant.deleteOne({ _id: merchant._id });

        return res.status(200).json({ success: true, message: "Merchant deleted" });
    } catch (error) {
        console.error("deleteMerchant error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to delete merchant" });
    }
};

const listStores = async (req, res) => {
    try {
        const { page, limit, skip } = parsePaging(req.query);

        const query = {};
        if (req.query.status) query.status = String(req.query.status).toUpperCase();
        if (req.query.merchant) query.merchant = req.query.merchant;
        if (req.query.search) {
            const search = new RegExp(escapeRegex(String(req.query.search).trim()), "i");
            query.$or = [{ name: search }, { publicCode: search }];
        }

        const [stores, total] = await Promise.all([
            Store.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("name publicCode status createdAt merchant")
                .populate("merchant", "businessName")
                .lean(),
            Store.countDocuments(query)
        ]);

        return res.status(200).json({ success: true, data: { stores, page, limit, total } });
    } catch (error) {
        console.error("listStores error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load stores" });
    }
};

const updateStore = async (req, res) => {
    try {
        const { status, name } = req.body || {};

        const store = await Store.findById(req.params.id);
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }

        const from = { status: store.status, name: store.name };

        if (status !== undefined) {
            const nextStatus = String(status).toUpperCase();

            if (!Store.schema.path("status").enumValues.includes(nextStatus)) {
                return res.status(400).json({ success: false, message: "status must be ACTIVE or SUSPENDED" });
            }

            store.status = nextStatus;
        }

        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ success: false, message: "Store name cannot be empty" });
            }
            store.name = String(name).trim();
        }

        await store.save();

        await recordAudit(req, {
            action: "STORE_UPDATED",
            entityType: "Store",
            entityId: store._id,
            merchant: store.merchant,
            store: store._id,
            details: { from, to: { status: store.status, name: store.name } }
        });

        return res.status(200).json({ success: true, message: "Store updated", data: { store } });
    } catch (error) {
        console.error("updateStore error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to update store" });
    }
};

// Same cascade the merchant gets when they delete their own location.
const deleteStore = async (req, res) => {
    try {
        const store = await Store.findById(req.params.id);

        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }

        await recordAudit(req, {
            action: "STORE_DELETED",
            entityType: "Store",
            entityId: store._id,
            merchant: store.merchant,
            details: { name: store.name, publicCode: store.publicCode }
        });

        await purgeStore(store._id);

        return res.status(200).json({ success: true, message: "Store deleted" });
    } catch (error) {
        console.error("deleteStore error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to delete store" });
    }
};

const listUsers = async (req, res) => {
    try {
        const { page, limit, skip } = parsePaging(req.query);

        const query = {};
        if (req.query.role) query.role = String(req.query.role).toUpperCase();
        if (req.query.search) {
            const search = new RegExp(escapeRegex(String(req.query.search).trim()), "i");
            query.$or = [{ name: search }, { phone: search }];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("name phone role isActive isPhoneVerified createdAt lastLoginAt")
                .lean(),
            User.countDocuments(query)
        ]);

        return res.status(200).json({ success: true, data: { users, page, limit, total } });
    } catch (error) {
        console.error("listUsers error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load users" });
    }
};

// An admin must never be able to lock themselves out, so self role changes and
// self deactivation are refused.
const updateUser = async (req, res) => {
    try {
        const { role, isActive, name } = req.body || {};

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isSelf = String(user._id) === String(req.user._id);

        const changes = {};

        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({ success: false, message: "Name cannot be empty" });
            }
            changes.name = String(name).trim();
        }

        if (role !== undefined) {
            const nextRole = String(role).toUpperCase();
            if (!USER_ROLES.includes(nextRole)) {
                return res.status(400).json({ success: false, message: `role must be one of ${USER_ROLES.join(", ")}` });
            }
            if (isSelf && nextRole !== user.role) {
                return res.status(400).json({ success: false, message: "You cannot change your own role" });
            }
            changes.role = nextRole;
        }

        if (isActive !== undefined) {
            const nextActive = Boolean(isActive);
            if (isSelf && nextActive === false) {
                return res.status(400).json({ success: false, message: "You cannot deactivate your own account" });
            }
            changes.isActive = nextActive;
        }

        if (!Object.keys(changes).length) {
            return res.status(400).json({ success: false, message: "No valid fields to update" });
        }

        const from = { role: user.role, isActive: user.isActive };
        Object.assign(user, changes);
        await user.save();

        await recordAudit(req, {
            action: "USER_UPDATED",
            entityType: "User",
            entityId: user._id,
            details: { from, to: { role: user.role, isActive: user.isActive } }
        });

        return res.status(200).json({ success: true, message: "User updated", data: { user } });
    } catch (error) {
        console.error("updateUser error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to update user" });
    }
};

// Deleting an account that still owns a shop would leave that shop without an
// owner, so the admin is pointed at the merchant first.
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (String(user._id) === String(req.user._id)) {
            return res.status(400).json({ success: false, message: "You cannot delete your own account" });
        }

        const ownedMerchant = await Merchant.findOne({ owner: user._id }).select("businessName").lean();

        if (ownedMerchant) {
            return res.status(409).json({
                success: false,
                message: `This number owns ${ownedMerchant.businessName}. Delete the merchant account first.`
            });
        }

        await recordAudit(req, {
            action: "USER_DELETED",
            entityType: "User",
            entityId: user._id,
            details: { phone: user.phone, role: user.role }
        });

        await User.deleteOne({ _id: user._id });

        return res.status(200).json({ success: true, message: "User deleted" });
    } catch (error) {
        console.error("deleteUser error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to delete user" });
    }
};

const subscriptionAlertRows = (subscriptions) =>
    subscriptions.map((subscription) => ({
        id: subscription._id,
        merchant: subscription.merchant?.businessName || "",
        merchantId: subscription.merchant?._id || null,
        planCode: subscription.planCode,
        status: subscription.status,
        dueDate: subscription.trialEnd || subscription.currentPeriodEnd || null
    }));

const getAlerts = async (req, res) => {
    try {
        const now = new Date();
        const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const subscriptionQuery = (status) =>
            Subscription.find({ status })
                .sort({ currentPeriodEnd: 1 })
                .limit(ALERT_LIMIT)
                .select("merchant planCode status trialEnd currentPeriodEnd")
                .populate("merchant", "businessName")
                .lean();

        const [
            trialsEndingSoon,
            pastDue,
            expired,
            paymentPending,
            pendingRefunds,
            pendingPlanChanges,
            openIssues
        ] = await Promise.all([
            Subscription.find({ status: "TRIALING", trialEnd: { $gte: now, $lte: soon } })
                .sort({ trialEnd: 1 })
                .limit(ALERT_LIMIT)
                .select("merchant planCode status trialEnd currentPeriodEnd")
                .populate("merchant", "businessName")
                .lean(),
            subscriptionQuery("PAST_DUE"),
            subscriptionQuery("EXPIRED"),
            subscriptionQuery("PAYMENT_PENDING"),
            RefundRequest.find({ status: "PENDING" })
                .sort({ createdAt: -1 })
                .limit(ALERT_LIMIT)
                .select("merchant amountRequested status createdAt")
                .populate("merchant", "businessName")
                .lean(),
            PlanChangeRequest.find({ status: "PENDING" })
                .sort({ createdAt: -1 })
                .limit(ALERT_LIMIT)
                .select("merchant type currentPlanCode requestedPlanCode status createdAt")
                .populate("merchant", "businessName")
                .lean(),
            Issue.find({ status: { $nin: ["RESOLVED", "CLOSED"] } })
                .sort({ createdAt: -1 })
                .limit(ALERT_LIMIT)
                .select("store title status priority createdAt")
                .populate({ path: "store", select: "name merchant", populate: { path: "merchant", select: "businessName" } })
                .lean()
        ]);

        return res.status(200).json({
            success: true,
            data: {
                trialsEndingSoon: subscriptionAlertRows(trialsEndingSoon),
                pastDue: subscriptionAlertRows(pastDue),
                expired: subscriptionAlertRows(expired),
                paymentPending: subscriptionAlertRows(paymentPending),
                pendingRefunds: pendingRefunds.map((refund) => ({
                    id: refund._id,
                    merchant: refund.merchant?.businessName || "",
                    merchantId: refund.merchant?._id || null,
                    status: refund.status,
                    amount: refund.amountRequested,
                    dueDate: refund.createdAt
                })),
                pendingPlanChanges: pendingPlanChanges.map((change) => ({
                    id: change._id,
                    merchant: change.merchant?.businessName || "",
                    merchantId: change.merchant?._id || null,
                    type: change.type,
                    from: change.currentPlanCode,
                    to: change.requestedPlanCode,
                    status: change.status,
                    dueDate: change.createdAt
                })),
                openIssues: openIssues.map((issue) => ({
                    id: issue._id,
                    store: issue.store?.name || "",
                    merchant: issue.store?.merchant?.businessName || "",
                    title: issue.title,
                    status: issue.status,
                    priority: issue.priority,
                    dueDate: issue.createdAt
                }))
            }
        });
    } catch (error) {
        console.error("getAlerts error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load platform alerts" });
    }
};

const listAuditLogs = async (req, res) => {
    try {
        const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));

        const query = {};
        if (req.query.entityType) query.entityType = req.query.entityType;
        if (req.query.merchant) query.merchant = req.query.merchant;

        const logs = await AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate("actor", "phone")
            .lean();

        return res.status(200).json({ success: true, data: { logs } });
    } catch (error) {
        console.error("listAuditLogs error : ", error.message);
        return res.status(500).json({ success: false, message: "Unable to load audit logs" });
    }
};

export {
    getOverview,
    listMerchants,
    getMerchantDetail,
    updateMerchant,
    deleteMerchant,
    listStores,
    updateStore,
    deleteStore,
    listUsers,
    updateUser,
    deleteUser,
    getAlerts,
    listAuditLogs
};
