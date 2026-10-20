import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

import User from "../models/user.model.js";
import Merchant from "../models/merchant.model.js";
import Store from "../models/store.model.js";
import Menu from "../models/menu.model.js";
import MenuCategory from "../models/menuCategory.model.js";
import MenuItem from "../models/menuItem.model.js";
import Table from "../models/table.model.js";
import LoyaltyProgram from "../models/loyaltyProgram.model.js";
import LoyaltyCard from "../models/loyaltyCard.model.js";
import LoyaltyTransaction from "../models/loyaltyTransaction.model.js";
import Reward from "../models/reward.model.js";
import RewardClaim from "../models/rewardClaim.model.js";
import GiftCard from "../models/giftCard.model.js";
import Order from "../models/order.model.js";
import Queue from "../models/queue.model.js";
import QueueEntry from "../models/queueEntry.model.js";
import StoreVisit from "../models/storeVisit.model.js";
import Feedback from "../models/feedback.model.js";
import Issue from "../models/issue.model.js";
import Campaign from "../models/campaign.model.js";
import Coupon from "../models/coupon.model.js";
import AnalyticsEvent from "../models/analyticEvent.model.js";
import AuditLog from "../models/auditLog.model.js";
import Plan from "../models/plan.model.js";
import Subscription from "../models/subscription.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import PlanChangeRequest from "../models/planChangeRequest.model.js";
import RefundRequest from "../models/refundRequest.model.js";

import { DEFAULT_PLANS } from "../config/plans.js";
import { buildPlanSnapshot } from "../services/entitlement.service.js";

// ---------------------------------------------------------------------------
// Qrenza demo data.
//
// Fills the platform with a realistic cast so the super admin, merchant desk
// and customer app all have something to show: merchants on different plans,
// stores with menus, customers with visit history, orders in every status.
//
// Safe to run more than once and it never deletes anything. Every record is
// matched on a stable key (phone, slug, code) before it is created.
// ---------------------------------------------------------------------------

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);
const minutesFromNow = (n) => new Date(Date.now() + n * 60 * 1000);
const visitDay = (date) => date.toISOString().slice(0, 10);

const CUSTOMERS = [
  {
    phone: "9811100011",
    name: "Priya Nair",
    email: "priya.nair@example.com",
    lastLoginAt: hoursAgo(3)
  },
  {
    phone: "9811100022",
    name: "Arjun Desai",
    email: "arjun.desai@example.com",
    lastLoginAt: daysAgo(2)
  },
  {
    phone: "9811100033",
    name: "Sneha Kapoor",
    email: "sneha.kapoor@example.com",
    lastLoginAt: daysAgo(9)
  }
];

const MERCHANTS = [
  {
    owner: { phone: "9822200011", name: "Karthik Rao", email: "karthik@brewbloom.in" },
    business: {
      businessName: "Brew & Bloom Cafe",
      businessType: "CAFE",
      contactEmail: "hello@brewbloom.in",
      contactPhone: "9822200011",
      instagramUrl: "https://instagram.com/brewbloom",
      reviewUrl: "https://g.page/brewbloom/review"
    },
    planCode: "GROWTH",
    subscriptionStatus: "ACTIVE",
    stores: [
      {
        name: "Brew & Bloom — Indiranagar",
        slug: "brew-bloom-indiranagar",
        phone: "9822200011",
        coordinates: [77.6413, 12.9719],
        address: { line1: "12, 100 Feet Road", line2: "Near Metro Station", city: "Bengaluru", state: "Karnataka", pincode: "560038" }
      },
      {
        name: "Brew & Bloom — Koramangala",
        slug: "brew-bloom-koramangala",
        phone: "9822200011",
        coordinates: [77.6245, 12.9352],
        address: { line1: "80, 5th Block", line2: "80 Feet Road", city: "Bengaluru", state: "Karnataka", pincode: "560095" }
      }
    ],
    menu: [
      { category: "Coffee", items: [["Cappuccino", 180, true], ["Cold Brew", 220, true], ["Filter Coffee", 90, true]] },
      { category: "Bakes", items: [["Butter Croissant", 160, true], ["Blueberry Muffin", 150, true], ["Chicken Puff", 140, false]] }
    ]
  },
  {
    owner: { phone: "9822200022", name: "Meera Shah", email: "meera@greenleafgrill.in" },
    business: {
      businessName: "Green Leaf Grill",
      businessType: "RESTAURANT",
      contactEmail: "frontdesk@greenleafgrill.in",
      contactPhone: "9822200022",
      instagramUrl: "https://instagram.com/greenleafgrill",
      reviewUrl: ""
    },
    planCode: "PRO",
    subscriptionStatus: "ACTIVE",
    stores: [
      {
        name: "Green Leaf Grill — MG Road",
        slug: "green-leaf-grill-mgroad",
        phone: "9822200022",
        coordinates: [77.6067, 12.9756],
        address: { line1: "5, Trinity Circle", line2: "MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" }
      }
    ],
    menu: [
      { category: "Starters", items: [["Paneer Tikka", 320, true], ["Chicken Seekh", 380, false]] },
      { category: "Mains", items: [["Veg Thali", 290, true], ["Butter Chicken", 420, false], ["Dal Makhani", 260, true]] }
    ]
  },
  {
    owner: { phone: "9822200033", name: "Vikram Singh", email: "vikram@dailydosa.in" },
    business: {
      businessName: "Daily Dosa Corner",
      businessType: "RESTAURANT",
      contactEmail: "care@dailydosa.in",
      contactPhone: "9822200033",
      instagramUrl: "",
      reviewUrl: ""
    },
    planCode: "BASIC",
    subscriptionStatus: "TRIALING",
    stores: [
      {
        name: "Daily Dosa Corner — Jayanagar",
        slug: "daily-dosa-jayanagar",
        phone: "9822200033",
        coordinates: [77.5833, 12.9250],
        address: { line1: "44, 4th Block", line2: "11th Main Road", city: "Bengaluru", state: "Karnataka", pincode: "560011" }
      }
    ],
    menu: [
      { category: "Dosa", items: [["Masala Dosa", 120, true], ["Ghee Roast", 160, true], ["Set Dosa", 100, true]] },
      { category: "Beverages", items: [["Filter Coffee", 60, true], ["Masala Tea", 50, true]] }
    ]
  }
];

async function ensurePlans() {
  const map = new Map();
  for (const plan of DEFAULT_PLANS) {
    const doc = await Plan.findOneAndUpdate(
      { code: plan.code },
      { $set: plan, $setOnInsert: { version: 1 } },
      { upsert: true, returnDocument: "after", runValidators: true }
    );
    map.set(doc.code, doc);
  }
  return map;
}

async function ensureUser({ phone, name, role, email, lastLoginAt }) {
  let user = await User.findOne({ phone });

  if (!user) {
    user = await User.create({
      phone,
      name,
      email,
      role,
      isPhoneVerified: true,
      isActive: true,
      lastLoginAt: lastLoginAt || new Date()
    });
    return user;
  }

  // Keep the demo profile fresh without ever touching a real account's role.
  if (user.role === role) {
    user.name = name;
    if (email) user.email = email;
    if (lastLoginAt) user.lastLoginAt = lastLoginAt;
    await user.save();
  }

  return user;
}

async function ensureMerchant(owner, business) {
  let merchant = await Merchant.findOne({ owner: owner._id });

  if (!merchant) {
    merchant = await Merchant.create({ owner: owner._id, ...business });
  } else {
    Object.assign(merchant, business);
    await merchant.save();
  }

  return merchant;
}

async function ensureStore(merchant, store) {
  let doc = await Store.findOne({ merchant: merchant._id, slug: store.slug });

  if (!doc) {
    doc = await Store.create({
      merchant: merchant._id,
      name: store.name,
      slug: store.slug,
      phone: store.phone,
      address: store.address,
      location: { type: "Point", coordinates: store.coordinates },
      status: "ACTIVE"
    });
  }

  return doc;
}

async function ensureTables(store, count = 10) {
  const tables = [];

  for (let n = 1; n <= count; n++) {
    const table = await Table.findOneAndUpdate(
      { store: store._id, tableNumber: String(n) },
      {
        $setOnInsert: {
          store: store._id,
          tableNumber: String(n),
          capacity: n % 3 === 0 ? 4 : 2,
          status: "AVAILABLE"
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    tables.push(table);
  }

  return tables;
}

async function ensureSubscription(merchant, plan, status) {
  const snapshot = buildPlanSnapshot(plan);
  const isTrial = status === "TRIALING";
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  const update = {
    plan: plan._id,
    planCode: plan.code,
    planSnapshot: snapshot,
    status,
    isCurrent: true,
    isTrial,
    trialUsed: true,
    trialStart: isTrial ? daysAgo(1) : null,
    trialEnd: isTrial ? new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
    currentPeriodStart: isTrial ? null : daysAgo(20),
    currentPeriodEnd: isTrial ? null : periodEnd,
    billingInterval: "YEARLY",
    currency: "INR",
    agreedAnnualAmount: isTrial ? 0 : plan.currentAnnualPrice || 0,
    totalPaidAmount: isTrial ? 0 : plan.currentAnnualPrice || 0,
    autoRenew: !isTrial,
    renewalStatus: "NONE",
    activatedBy: isTrial ? "TRIAL" : "PAYMENT"
  };

  return Subscription.findOneAndUpdate(
    { merchant: merchant._id, isCurrent: true },
    { $set: update },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function ensureMenu(store, menuSeed, createdItems) {
  let menu = await Menu.findOne({ store: store._id });

  if (!menu) {
    menu = await Menu.create({
      store: store._id,
      name: `${store.name} Menu`,
      description: "Freshly prepared, updated by the kitchen.",
      isPublished: true
    });
  } else {
    menu.isPublished = true;
    await menu.save();
  }

  let categoryOrder = 0;

  for (const block of menuSeed) {
    let category = await MenuCategory.findOne({ menu: menu._id, name: block.category });

    if (!category) {
      category = await MenuCategory.create({
        menu: menu._id,
        store: store._id,
        name: block.category,
        sortOrder: categoryOrder++
      });
    }

    let itemOrder = 0;

    for (const [name, price, isVeg] of block.items) {
      let item = await MenuItem.findOne({ store: store._id, name });

      if (!item) {
        item = await MenuItem.create({
          menu: menu._id,
          category: category._id,
          store: store._id,
          name,
          price,
          isVeg,
          preparationTimeMinutes: 12,
          sortOrder: itemOrder++
        });
      }

      createdItems.push(item);
    }
  }

  return { menu, items: createdItems };
}

async function ensureLoyaltyProgram(store) {
  return LoyaltyProgram.findOneAndUpdate(
    { store: store._id },
    { $set: { name: `${store.name} Rewards`, stampsRequired: 10, stampRule: "ONE_PER_PURCHASE", isActive: true } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

async function ensureFeedbackAndIssue(store, user, rating, comment, category) {
  let feedback = await Feedback.findOne({ store: store._id, user: user._id, comment });

  if (!feedback) {
    feedback = await Feedback.create({ store: store._id, user: user._id, rating, comment, category, source: "POST_VISIT" });
  }

  if (rating <= 3) {
    const existing = await Issue.findOne({ feedback: feedback._id });
    if (!existing) {
      await Issue.create({
        feedback: feedback._id,
        store: store._id,
        user: user._id,
        title: `${category} issue at ${store.name}`,
        description: comment,
        category,
        priority: rating <= 2 ? "HIGH" : "MEDIUM",
        status: "OPEN"
      });
    }
  }

  return feedback;
}

async function ensureOrders(store, customer, itemSeeds, plan) {
  // Skip if this store already carries demo orders so re-runs stay clean.
  const existing = await Order.exists({ store: store._id, customerPhone: customer.phone });
  if (existing) return [];

  const pick = (a, b) => [itemSeeds[a % itemSeeds.length], itemSeeds[b % itemSeeds.length]];
  const created = [];

  const build = (lines, status, extra = {}) => {
    const items = lines.map((item, i) => ({
      item: item._id,
      name: item.name,
      price: item.price,
      quantity: i === 0 ? 2 : 1,
      isFree: false
    }));
    const subtotal = items.reduce((sum, line) => sum + line.price * line.quantity, 0);
    return { items, subtotal, total: subtotal - (extra.discount || 0), ...extra, status };
  };

  const specs = [
    { status: "PLACED", created: hoursAgo(0.2), ready: minutesFromNow(12), table: "5" },
    { status: "ACCEPTED", created: hoursAgo(0.6), ready: minutesFromNow(8), table: "2" },
    { status: "PREPARING", created: hoursAgo(1.5), ready: minutesFromNow(4), table: "" },
    { status: "READY", created: hoursAgo(2), ready: minutesFromNow(0), table: "9" },
    { status: "SERVED", created: daysAgo(2), ready: daysAgo(2), table: "3" },
    { status: "SERVED", created: daysAgo(6), ready: daysAgo(6), table: "1" },
    { status: "CANCELLED", created: daysAgo(4), ready: daysAgo(4), table: "" }
  ];

  if (plan.code === "BASIC") specs.splice(0, specs.length - 3); // trial shop has a lighter history

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const [a, b] = pick(i, i + 1);
    const payload = build([a, b], spec.status, {
      tableNumber: spec.table,
      note: i === 0 ? "Less spicy please" : "",
      estimatedReadyAt: spec.ready
    });

    const order = await Order.create({
      store: store._id,
      user: customer._id,
      customerName: customer.name,
      customerPhone: customer.phone,
      ...payload
    });

    // Backdate so the desk and analytics look like they have real history.
    await Order.updateOne({ _id: order._id }, { $set: { createdAt: spec.created, updatedAt: spec.created } });
    created.push(order);
  }

  return created;
}

async function ensureQueue(store, customer) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const queue = await Queue.findOneAndUpdate(
    { store: store._id, serviceDate: startOfDay },
    {
      $setOnInsert: {
        store: store._id,
        serviceDate: startOfDay,
        status: "OPEN",
        averageServiceMinutes: 10,
        lastIssuedToken: 2,
        lastServedToken: 1
      }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const waiting = await QueueEntry.findOneAndUpdate(
    { queue: queue._id, tokenNumber: 1 },
    {
      $setOnInsert: {
        queue: queue._id,
        store: store._id,
        user: customer._id,
        customerName: customer.name,
        customerPhone: customer.phone,
        tokenNumber: 1,
        status: "WAITING",
        positionAtJoin: 1,
        estimatedWaitMinutes: 8
      }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  return { queue, waiting };
}

async function ensureGiftCards(store, customer) {
  const seeds = [
    { code: `GC-${store.publicCode}-A`, title: "10% off your next order", type: "DISCOUNT", discountType: "PERCENTAGE", value: 10, source: "STREAK", visitCount: 7, status: "ACTIVE" },
    { code: `GC-${store.publicCode}-B`, title: "Free filter coffee", type: "FREE_ITEM", discountType: null, value: 0, freeItemName: "Filter Coffee", source: "MERCHANT", status: "ACTIVE" }
  ];

  const created = [];

  for (const seed of seeds) {
    const card = await GiftCard.findOneAndUpdate(
      { code: seed.code },
      {
        $set: {
          store: store._id,
          user: customer._id,
          customerPhone: customer.phone,
          title: seed.title,
          type: seed.type,
          discountType: seed.discountType,
          value: seed.value,
          freeItemName: seed.freeItemName || "",
          source: seed.source,
          visitCount: seed.visitCount || 0,
          status: seed.status,
          issuedAt: daysAgo(3),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
    created.push(card);
  }

  return created;
}

async function seedStoreExperiences(merchant, store, plan, customers, createdItems) {
  const program = await ensureLoyaltyProgram(store);

  const storeItems = createdItems.filter((item) => String(item.store) === String(store._id));

  // Rewards available to scratch/loyalty winners.
  let reward = await Reward.findOne({ store: store._id, name: "Free Dessert" });
  if (!reward) {
    reward = await Reward.create({
      store: store._id,
      program: program._id,
      name: "Free Dessert",
      description: "A free dessert on your next visit.",
      type: "FREE_ITEM",
      value: 0,
      probability: 20,
      validityDays: 30
    });
  }

  let coupon = await Coupon.findOne({ code: `WELCOME-${store.publicCode}` });
  if (!coupon) {
    coupon = await Coupon.create({
      store: store._id,
      code: `WELCOME-${store.publicCode}`,
      discountType: "PERCENTAGE",
      value: 15,
      minOrderValue: 200,
      validFrom: daysAgo(5),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE"
    });
  }

  // Campaign touch so the marketing screen is not empty.
  const campaignExists = await Campaign.exists({ store: store._id });
  if (!campaignExists) {
    await Campaign.create({
      store: store._id,
      createdBy: merchant.owner,
      name: "Weekend comeback offer",
      channel: "WHATSAPP",
      audience: { segment: "INACTIVE_CUSTOMERS", inactiveDays: 14 },
      messageTemplate: `Hi! We miss you at ${store.name}. Here is 15% off this weekend.`,
      status: "COMPLETED",
      totalRecipients: 12,
      sentCount: 12,
      deliveredCount: 11
    });
  }

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    const stamps = [8, 5, 3][i % 3];

    const card = await LoyaltyCard.findOneAndUpdate(
      { user: customer._id, store: store._id },
      {
        $set: {
          program: program._id,
          stamps,
          totalStampsEarned: stamps + 4,
          totalRewardsEarned: i === 0 ? 1 : 0,
          status: "ACTIVE"
        }
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    // One transaction per stamp so the CRM profile has a timeline.
    const existingTxn = await LoyaltyTransaction.exists({ user: customer._id, store: card._id });
    if (!existingTxn) {
      for (let s = 1; s <= stamps; s++) {
        await LoyaltyTransaction.create({
          user: customer._id,
          store: card._id,
          type: "STAMP",
          delta: 1,
          balanceAfter: s,
          referenceType: "PURCHASE",
          idempotencyKey: `seed-${card._id}-${s}`,
          note: "Visit stamp"
        });
      }
    }

    // Visit rows spread across the last two weeks for the streak engine.
    for (let d = 0; d < stamps; d++) {
      const day = daysAgo(d * 2 + i);
      await StoreVisit.findOneAndUpdate(
        { store: store._id, user: customer._id, visitDay: visitDay(day) },
        { $setOnInsert: { scannedAt: day } },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    await ensureGiftCards(store, customer);
    await ensureOrders(store, customer, storeItems, plan);

    // A reward claim for the first customer only, so counts are believable.
    if (i === 0) {
      const claim = await RewardClaim.findOne({ user: customer._id, store: store._id });
      if (!claim) {
        await RewardClaim.create({
          user: customer._id,
          store: store._id,
          reward: reward._id,
          source: "SCRATCH",
          code: `RC-${store.publicCode}-${customer.phone.slice(-4)}`,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        });
      }
    }
  }

  // Feedback: a happy one and a rough one so the inbox shows both paths.
  await ensureFeedbackAndIssue(store, customers[0], 5, `Loved the ${storeItems[0]?.name || "food"} here.`, "PRODUCT");
  await ensureFeedbackAndIssue(store, customers[2], 2, `Wait time was long during lunch.`, "WAIT_TIME");

  await ensureQueue(store, customers[1]);

  // History for the analytics chart.
  const existingEvent = await AnalyticsEvent.exists({ store: store._id });
  if (!existingEvent) {
    for (let d = 0; d < 14; d++) {
      const rows = 2 + ((d * 3) % 5);
      for (let r = 0; r < rows; r++) {
        await AnalyticsEvent.create({
          store: store._id,
          user: customers[r % customers.length]._id,
          sessionId: `seed-${store.publicCode}-${d}-${r}`,
          eventType: "STORE_SCAN",
          occurredAt: daysAgo(d)
        });
      }
    }
  }
}

async function seedBillingExtras(merchant, plan) {
  const payment = await PaymentTransaction.findOneAndUpdate(
    { providerOrderId: `order_demo_${plan.code}_${String(merchant._id).slice(-6)}` },
    {
      $set: {
        merchant: merchant._id,
        planCode: plan.code,
        purpose: "SUBSCRIPTION",
        providerPaymentId: `pay_demo_${plan.code}_${String(merchant._id).slice(-6)}`,
        amount: plan.currentAnnualPrice || 0,
        currency: "INR",
        status: "PAID",
        verifiedAt: daysAgo(20)
      }
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // A pending upgrade request so the admin alert list has something to review.
  const changeExists = await PlanChangeRequest.exists({ merchant: merchant._id, status: "PENDING" });
  if (!changeExists) {
    await PlanChangeRequest.create({
      merchant: merchant._id,
      type: "UPGRADE",
      currentPlanCode: plan.code,
      requestedPlanCode: plan.code === "PRO" ? "ENTERPRISE" : "PRO",
      status: "PENDING",
      note: "We are opening a second branch next month."
    });
  }

  // One pending refund so the refund queue is exercised too.
  const refundExists = await RefundRequest.exists({ merchant: merchant._id, status: "PENDING" });
  if (!refundExists) {
    await RefundRequest.create({
      merchant: merchant._id,
      payment: payment._id,
      providerPaymentId: payment.providerPaymentId || "",
      amountRequested: payment.amount,
      reason: "Added the wrong location count at checkout.",
      eligible: true,
      policyBasis: "First purchase refund requested within 7 days.",
      status: "PENDING"
    });
  }
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding demo data (existing records are kept)...");

  const plans = await ensurePlans();

  const admin = await User.findOne({ role: "SUPER_ADMIN" });

  const customers = [];
  for (const seed of CUSTOMERS) {
    customers.push(await ensureUser({ ...seed, role: "CUSTOMER" }));
  }

  let merchantIndex = 0;

  for (const seed of MERCHANTS) {
    const owner = await ensureUser({ ...seed.owner, role: "MERCHANT" });
    const merchant = await ensureMerchant(owner, seed.business);
    const plan = plans.get(seed.planCode);

    await ensureSubscription(merchant, plan, seed.subscriptionStatus);

    const createdItems = [];

    for (const storeSeed of seed.stores) {
      const store = await ensureStore(merchant, storeSeed);
      await ensureMenu(store, seed.menu, createdItems);
      await ensureTables(store);
      await seedStoreExperiences(merchant, store, plan, customers, createdItems);
    }

    await seedBillingExtras(merchant, plan);

    if (admin) {
      await AuditLog.findOneAndUpdate(
        { actor: admin._id, action: "MERCHANT_SEEDED", entityId: merchant._id },
        {
          $set: {
            merchant: merchant._id,
            entityType: "Merchant",
            details: { businessName: seed.business.businessName, planCode: seed.planCode }
          }
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`Merchant ready : ${seed.business.businessName} (${seed.planCode}/${seed.subscriptionStatus})`);
    merchantIndex += 1;
  }

  console.log("==================================");
  console.log("QRENZA DEMO SEED COMPLETE");
  console.log(`Merchants : ${merchantIndex}`);
  console.log(`Customers : ${customers.length}`);
  console.log("==================================");
}

run()
  .catch((error) => {
    console.error("Demo seed failed :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
