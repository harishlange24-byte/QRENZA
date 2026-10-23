import { z } from "zod";

export const phoneSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian number")
});

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits")
});

// The super admin console is the only email + password screen.
export const adminLoginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const merchantSchema = z.object({
  businessName: z.string().min(2).max(100),
  businessType: z.enum([
    "RESTAURANT", "GROCERY", "PHARMACY", "CLOTHING", "ELECTRONICS",
    "SALON", "BAKERY", "RETAIL", "CAFE", "OTHER"
  ]),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid phone"),
  logo: z.string().optional(),
  reviewUrl: z.string().url().or(z.literal("")).optional(),
  instagramUrl: z.string().url().or(z.literal("")).optional()
});

export const storeSchema = z.object({
  name: z.string().min(2).max(150),
  phone: z.string().min(8),
  line1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  geofenceRadius: z.coerce.number().min(20).max(500).default(100)
});

// The menu desk adds a category and its first item in one shot, so the
// category name travels with the item instead of a raw category id.
export const menuEntrySchema = z.object({
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  price: z.coerce.number().min(0),
  isVeg: z.boolean().default(true)
});

export const feedbackSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  category: z.enum(["PRODUCT", "SERVICE", "STAFF", "WAIT_TIME", "PRICE", "CLEANLINESS", "OTHER"]),
  comment: z.string().max(2000).optional()
});

// A reward is just what it gives and how many the shop will hand out.
export const rewardSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(["DISCOUNT", "FREE_ITEM", "COUPON", "CUSTOM"]),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  value: z.coerce.number().min(0).default(0),
  quantity: z.union([z.coerce.number().min(1), z.literal("")]).optional(),
  validityDays: z.coerce.number().min(1).default(30)
});

export const queueJoinSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/)
});

export const orderSchema = z.object({
  customerName: z.string().min(2),
  customerPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"),
  tableNumber: z.string().optional(),
  note: z.string().max(300).optional()
});

// The phone is optional, a blank one means the card is a shop wide offer.
export const giftCardSchema = z.object({
  phone: z.union([z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"), z.literal("")]).optional(),
  title: z.string().min(2).max(150),
  type: z.enum(["DISCOUNT", "FREE_ITEM"]),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  value: z.coerce.number().min(0).default(0),
  freeItemName: z.string().optional(),
  minOrderValue: z.coerce.number().min(0).default(0),
  validityDays: z.coerce.number().min(1).default(30)
});

export const supplyOrderSchema = z.object({
  contactName: z.string().min(2),
  contactPhone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number"),
  deliveryAddress: z.string().min(5),
  note: z.string().max(300).optional()
});
