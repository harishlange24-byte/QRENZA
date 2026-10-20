// Central plan catalogue defaults and billing policy for Qrenza.
// Every money value here is integer paise (rupees * 100). Never store rupees as a float.

export const PLAN_FEATURES = {
  DIGITAL_STAMPS: "DIGITAL_STAMPS",
  AI_MENU: "AI_MENU",
  ONLINE_ORDERING: "ONLINE_ORDERING",
  SCRATCH_CARDS: "SCRATCH_CARDS",
  QR_QUEUE: "QR_QUEUE",
  FEEDBACK_INBOX: "FEEDBACK_INBOX",
  CUSTOMER_CRM: "CUSTOMER_CRM",
  UNLIMITED_QR_SCANS: "UNLIMITED_QR_SCANS",
  ANALYTICS: "ANALYTICS",
  MULTI_BRANCH_QR: "MULTI_BRANCH_QR",
  GPS_BRANCH_DETECTION: "GPS_BRANCH_DETECTION",
  BRANCH_ANALYTICS: "BRANCH_ANALYTICS",
  WHATSAPP_CAMPAIGNS: "WHATSAPP_CAMPAIGNS",
  STAFF_ACCOUNTS: "STAFF_ACCOUNTS",
  PRIORITY_SUPPORT: "PRIORITY_SUPPORT",
  DEDICATED_ACCOUNT_MANAGER: "DEDICATED_ACCOUNT_MANAGER",
  FREE_QR_STAND: "FREE_QR_STAND",
  ENTERPRISE_CUSTOM: "ENTERPRISE_CUSTOM"
};

// Human labels are served to the frontend so the pricing page and the
// comparison table always render the same feature list.
export const FEATURE_LABELS = {
  DIGITAL_STAMPS: "Digital stamp cards",
  AI_MENU: "AI digital menu",
  ONLINE_ORDERING: "Table ordering and gift cards",
  SCRATCH_CARDS: "Scratch cards",
  QR_QUEUE: "Smart queue and tokens",
  FEEDBACK_INBOX: "Feedback and complaint inbox",
  CUSTOMER_CRM: "Customer CRM and profiles",
  UNLIMITED_QR_SCANS: "Unlimited QR scans",
  ANALYTICS: "Analytics dashboard",
  MULTI_BRANCH_QR: "Single QR code across branches",
  GPS_BRANCH_DETECTION: "GPS based branch detection",
  BRANCH_ANALYTICS: "Branch-wise scan analytics",
  WHATSAPP_CAMPAIGNS: "WhatsApp campaigns",
  STAFF_ACCOUNTS: "Staff accounts and roles",
  PRIORITY_SUPPORT: "Priority support",
  DEDICATED_ACCOUNT_MANAGER: "Dedicated account manager",
  FREE_QR_STAND: "Free physical QR stand",
  ENTERPRISE_CUSTOM: "Enterprise customization"
};

// Ordered feature list for the pricing comparison table. Every key from
// PLAN_FEATURES must appear here exactly once.
export const FEATURE_ORDER = [
  "DIGITAL_STAMPS",
  "AI_MENU",
  "ONLINE_ORDERING",
  "SCRATCH_CARDS",
  "QR_QUEUE",
  "FEEDBACK_INBOX",
  "CUSTOMER_CRM",
  "ANALYTICS",
  "UNLIMITED_QR_SCANS",
  "MULTI_BRANCH_QR",
  "GPS_BRANCH_DETECTION",
  "BRANCH_ANALYTICS",
  "WHATSAPP_CAMPAIGNS",
  "STAFF_ACCOUNTS",
  "PRIORITY_SUPPORT",
  "DEDICATED_ACCOUNT_MANAGER",
  "FREE_QR_STAND",
  "ENTERPRISE_CUSTOM"
];

// SEED source. The database is the runtime source of truth, this is only used
// to create/refresh plans and as a safe fallback before the first seed.
export const DEFAULT_PLANS = [
  {
    code: "BASIC",
    displayName: "Basic",
    description: "One location. Stamps, menu, scratch cards and analytics for a single counter.",
    currentAnnualPrice: 99900,
    referenceAnnualPrice: 199900,
    maximumLocations: 1,
    unlimitedLocations: false,
    features: [
      "DIGITAL_STAMPS",
      "AI_MENU",
      "ONLINE_ORDERING",
      "SCRATCH_CARDS",
      "QR_QUEUE",
      "FEEDBACK_INBOX",
      "CUSTOMER_CRM",
      "UNLIMITED_QR_SCANS",
      "ANALYTICS",
      "FREE_QR_STAND"
    ],
    supportLevel: "BASIC",
    isContactOnly: false,
    sortOrder: 1
  },
  {
    code: "GROWTH",
    displayName: "Growth",
    description: "Up to 3 locations with one QR code and GPS based branch detection.",
    currentAnnualPrice: 249900,
    referenceAnnualPrice: 499900,
    maximumLocations: 3,
    unlimitedLocations: false,
    features: [
      "DIGITAL_STAMPS",
      "AI_MENU",
      "ONLINE_ORDERING",
      "SCRATCH_CARDS",
      "QR_QUEUE",
      "FEEDBACK_INBOX",
      "CUSTOMER_CRM",
      "UNLIMITED_QR_SCANS",
      "ANALYTICS",
      "MULTI_BRANCH_QR",
      "GPS_BRANCH_DETECTION",
      "BRANCH_ANALYTICS",
      "WHATSAPP_CAMPAIGNS",
      "STAFF_ACCOUNTS",
      "PRIORITY_SUPPORT",
      "FREE_QR_STAND"
    ],
    supportLevel: "PRIORITY",
    isContactOnly: false,
    sortOrder: 2
  },
  {
    code: "PRO",
    displayName: "Pro",
    description: "Up to 6 locations with branch analytics and a dedicated account manager.",
    currentAnnualPrice: 499900,
    referenceAnnualPrice: 999900,
    maximumLocations: 6,
    unlimitedLocations: false,
    features: [
      "DIGITAL_STAMPS",
      "AI_MENU",
      "ONLINE_ORDERING",
      "SCRATCH_CARDS",
      "QR_QUEUE",
      "FEEDBACK_INBOX",
      "CUSTOMER_CRM",
      "UNLIMITED_QR_SCANS",
      "ANALYTICS",
      "MULTI_BRANCH_QR",
      "GPS_BRANCH_DETECTION",
      "BRANCH_ANALYTICS",
      "WHATSAPP_CAMPAIGNS",
      "STAFF_ACCOUNTS",
      "PRIORITY_SUPPORT",
      "DEDICATED_ACCOUNT_MANAGER",
      "FREE_QR_STAND"
    ],
    supportLevel: "DEDICATED",
    isContactOnly: false,
    sortOrder: 3
  },
  {
    code: "ENTERPRISE",
    displayName: "Enterprise",
    description: "Unlimited locations and custom commercial terms. Priced on request.",
    currentAnnualPrice: null,
    referenceAnnualPrice: null,
    maximumLocations: null,
    unlimitedLocations: true,
    features: [
      "DIGITAL_STAMPS",
      "AI_MENU",
      "ONLINE_ORDERING",
      "SCRATCH_CARDS",
      "QR_QUEUE",
      "FEEDBACK_INBOX",
      "CUSTOMER_CRM",
      "UNLIMITED_QR_SCANS",
      "ANALYTICS",
      "MULTI_BRANCH_QR",
      "GPS_BRANCH_DETECTION",
      "BRANCH_ANALYTICS",
      "WHATSAPP_CAMPAIGNS",
      "STAFF_ACCOUNTS",
      "PRIORITY_SUPPORT",
      "DEDICATED_ACCOUNT_MANAGER",
      "FREE_QR_STAND",
      "ENTERPRISE_CUSTOM"
    ],
    supportLevel: "CUSTOM",
    isContactOnly: true,
    sortOrder: 4
  }
];

// Billing/policy configuration. Read from env at call time so dotenv has run
// before the values are used. Nothing here is a secret.
export function getBillingConfig() {
  return {
    currency: process.env.BILLING_CURRENCY || "INR",
    billingInterval: "YEARLY",
    trialDays: Number(process.env.TRIAL_DAYS || 3),
    taxPercent: Number(process.env.BILLING_TAX_PERCENT || 18),
    taxLabel: process.env.BILLING_TAX_LABEL || "GST",
    // The public pricing page shows the exact payable amount, so by default the
    // listed annual price already includes tax.
    pricesIncludeTax: (process.env.PRICES_INCLUDE_TAX || "true") === "true",
    refundWindowDays: Number(process.env.REFUND_WINDOW_DAYS || 7),
    supportEmail: process.env.BILLING_SUPPORT_EMAIL || "support@qrenza.in",
    // SUBSCRIPTION_ONLY: a merchant without any subscription row keeps working.
    // STRICT: a merchant without an active plan is denied paid actions.
    planEnforcementMode: process.env.PLAN_ENFORCEMENT_MODE || "SUBSCRIPTION_ONLY"
  };
}

export const REFUND_POLICY = {
  firstPurchaseWindowDays: 7,
  renewalWindowDays: 7,
  renewalRequiresNoUsage: true,
  coversDuplicateOrFailedCharges: true,
  coversServiceNotDelivered: true,
  currentPeriodGenerallyNonRefundable: true,
  processingNote:
    "Approved refunds are processed through Razorpay to the original payment method within 5-7 working days, subject to bank processing time."
};

export const SUBSCRIPTION_STATUSES = [
  "TRIALING",
  "ACTIVE",
  "PAYMENT_PENDING",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
  "SUSPENDED"
];

// Statuses that still give the merchant access to paid functionality.
export const USABLE_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"];
