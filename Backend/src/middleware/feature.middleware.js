import { resolveMerchant } from "../utils/access.js";
import { resolveAccess, hasFeature } from "../services/entitlement.service.js";
import { FEATURE_LABELS } from "../config/plans.js";

// Server side feature guard. Hiding a button in the UI is never enough, so a
// paid action is only allowed when the merchant's current plan includes it.
const requireFeature = (feature) => {
    return async (req, res, next) => {
        try {
            const merchant = await resolveMerchant(req.user);

            if (!merchant) {
                return res.status(403).json({
                    success: false,
                    code: "MERCHANT_NOT_FOUND",
                    message: "Only a merchant account can use this feature"
                });
            }

            const access = await resolveAccess(merchant._id);

            // A merchant with no active plan is sent to the plan picker, not
            // told that a single feature is missing.
            if (!access.isUsable) {
                return res.status(402).json({
                    success: false,
                    code: "PLAN_INACTIVE",
                    message: access.messages?.[0] || "Your plan is not active. Choose a plan to continue."
                });
            }

            if (!hasFeature(access, feature)) {
                return res.status(403).json({
                    success: false,
                    code: "FEATURE_LOCKED",
                    feature,
                    planCode: access.planCode,
                    message: `${FEATURE_LABELS[feature] || feature} is not included in your ${access.planCode} plan. Upgrade to unlock it.`
                });
            }

            req.access = access;
            return next();
        } catch (error) {
            console.error("requireFeature error : ", error);
            return res.status(500).json({ success: false, message: "Unable to verify your plan" });
        }
    };
};

export { requireFeature };
