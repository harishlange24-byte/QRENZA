import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import "../models/index.js";
import { DEFAULT_PLANS } from "../config/plans.js";
import { computeTotals } from "../services/pricing.service.js";
import {
  activatePaidSubscription,
  assertCanAddLocation,
  getCurrentSubscription,
  resolveAccess,
  startTrial
} from "../services/entitlement.service.js";
import { markPaymentFailed, settleVerifiedPayment } from "../services/billing.service.js";

const Merchant = mongoose.model("Merchant");
const Plan = mongoose.model("Plan");
const Store = mongoose.model("Store");
const Subscription = mongoose.model("Subscription");
const PaymentTransaction = mongoose.model("PaymentTransaction");

// Isolated database. Never the application database, and dropped again after.
const TEST_DB = "qrenza_billing_test_db";
const CONNECT_TIMEOUT_MS = 15000;

let dbReady = false;

const unique = () => `${Date.now()}${Math.floor(Math.random() * 100000)}`;
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function makeMerchant() {
  return Merchant.create({
    owner: new mongoose.Types.ObjectId(),
    businessName: "Billing Test Cafe",
    businessType: "CAFE",
    contactEmail: `billing-${unique()}@qrenza.test`,
    contactPhone: "9876543210"
  });
}

function createStoreFor(merchantId, name) {
  return Store.create({
    merchant: merchantId,
    name,
    slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${unique()}`,
    phone: "9876543210",
    location: { type: "Point", coordinates: [77.6, 12.9] }
  });
}

async function activatePlan(merchantId, code) {
  const plan = await Plan.findOne({ code });
  return activatePaidSubscription({ merchantId, plan, totals: computeTotals(plan) });
}

before(async () => {
  if (!process.env.MONGO_URI) {
    console.log("Integration tests skipped: MONGO_URI is not configured");
    return;
  }

  try {
    await Promise.race([
      mongoose.connect(process.env.MONGO_URI, { dbName: TEST_DB }),
      new Promise((resolve, reject) => setTimeout(() => reject(new Error("connect timeout")), CONNECT_TIMEOUT_MS))
    ]);

    await mongoose.connection.dropDatabase();

    // Indexes must exist for the unique constraints to actually be enforced.
    await Promise.all([Merchant.init(), Plan.init(), Store.init(), Subscription.init(), PaymentTransaction.init()]);

    for (const plan of DEFAULT_PLANS) {
      await Plan.findOneAndUpdate(
        { code: plan.code },
        plan,
        { upsert: true, returnDocument: "after", runValidators: true }
      );
    }

    dbReady = true;
  } catch (error) {
    dbReady = false;
    console.log(`Integration tests skipped: ${error.message}`);
  }
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.connection.dropDatabase();
    } catch (error) {
      console.log(`Could not drop the test database: ${error.message}`);
    }
    await mongoose.disconnect();
  }
});

test("a three day trial is created with the correct expiry", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  const started = await startTrial(merchant._id, "GROWTH");
  assert.equal(started.ok, true);
  assert.equal(started.code, "TRIAL_STARTED");

  const subscription = await getCurrentSubscription(merchant._id);
  assert.equal(subscription.status, "TRIALING");
  assert.equal(subscription.isTrial, true);
  assert.equal(subscription.trialUsed, true);

  const days = (subscription.trialEnd.getTime() - subscription.trialStart.getTime()) / (24 * 60 * 60 * 1000);
  assert.equal(Math.round(days), 3);

  const access = await resolveAccess(merchant._id);
  assert.equal(access.status, "TRIALING");
  assert.equal(access.isUsable, true);
  assert.equal(access.maximumLocations, 3);
  assert.match(access.trialLabel, /left/);
});

test("a repeated trial request reuses the running trial", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await startTrial(merchant._id, "BASIC");
  const again = await startTrial(merchant._id, "BASIC");

  assert.equal(again.ok, true);
  assert.equal(again.code, "ALREADY_TRIALING");
  assert.equal(await Subscription.countDocuments({ merchant: merchant._id }), 1);
});

test("concurrent trial requests create exactly one subscription", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  const results = await Promise.all([
    startTrial(merchant._id, "PRO"),
    startTrial(merchant._id, "PRO"),
    startTrial(merchant._id, "PRO")
  ]);

  assert.equal(results.every((result) => result.ok), true);
  assert.equal(await Subscription.countDocuments({ merchant: merchant._id }), 1);
  assert.equal(await Subscription.countDocuments({ merchant: merchant._id, isCurrent: true }), 1);
});

test("an expired trial loses paid access but keeps its records", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await startTrial(merchant._id, "GROWTH", daysAgo(4));

  const access = await resolveAccess(merchant._id);
  assert.equal(access.status, "EXPIRED");
  assert.equal(access.isUsable, false);
  assert.equal(access.restrictions.includes("PLAN_INACTIVE"), true);
  assert.equal(access.locationUsage.canAdd, false);

  // The subscription row and its history are preserved, nothing is deleted.
  assert.equal(await Subscription.countDocuments({ merchant: merchant._id }), 1);
  const subscription = await getCurrentSubscription(merchant._id);
  assert.ok(subscription.trialStart);
  assert.equal(subscription.trialUsed, true);
});

test("an expired trial is denied paid actions", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await startTrial(merchant._id, "BASIC", daysAgo(10));

  const guard = await assertCanAddLocation(merchant._id);
  assert.equal(guard.allowed, false);
  assert.equal(guard.code, "PLAN_INACTIVE");
});

test("Basic stops at one location, Growth allows three", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await activatePlan(merchant._id, "BASIC");

  assert.equal((await assertCanAddLocation(merchant._id)).allowed, true);
  await createStoreFor(merchant._id, "Basic One");

  const blocked = await assertCanAddLocation(merchant._id);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.code, "LOCATION_LIMIT_REACHED");

  // Moving to a bigger plan is what lifts the limit.
  await activatePlan(merchant._id, "GROWTH");
  await createStoreFor(merchant._id, "Growth Two");
  await createStoreFor(merchant._id, "Growth Three");

  const growthBlocked = await assertCanAddLocation(merchant._id);
  assert.equal(growthBlocked.allowed, false);
  assert.equal(growthBlocked.access.maximumLocations, 3);
});

test("Pro allows six locations and Enterprise is unlimited", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const proMerchant = await makeMerchant();
  await activatePlan(proMerchant._id, "PRO");
  for (let index = 0; index < 6; index++) {
    await createStoreFor(proMerchant._id, `Pro Store ${index}`);
  }
  assert.equal((await assertCanAddLocation(proMerchant._id)).allowed, false);

  const enterpriseMerchant = await makeMerchant();
  await activatePlan(enterpriseMerchant._id, "ENTERPRISE");
  for (let index = 0; index < 8; index++) {
    await createStoreFor(enterpriseMerchant._id, `Enterprise Store ${index}`);
  }
  const access = await resolveAccess(enterpriseMerchant._id);
  assert.equal(access.unlimitedLocations, true);
  assert.equal((await assertCanAddLocation(enterpriseMerchant._id)).allowed, true);
});

test("a suspended store does not count against the location limit", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await activatePlan(merchant._id, "BASIC");

  const store = await createStoreFor(merchant._id, "Paused Store");
  store.status = "SUSPENDED";
  await store.save();

  assert.equal((await assertCanAddLocation(merchant._id)).allowed, true);
});

test("a failed payment never activates a plan", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await startTrial(merchant._id, "BASIC");

  const transaction = await PaymentTransaction.create({
    merchant: merchant._id,
    planCode: "BASIC",
    amount: 99900,
    providerOrderId: `order_${unique()}`,
    status: "CREATED"
  });

  await markPaymentFailed({ transaction, reason: "Card declined by issuer" });

  const access = await resolveAccess(merchant._id);
  assert.notEqual(access.status, "ACTIVE");
  assert.equal(access.rawStatus, "PAYMENT_PENDING");
  assert.equal(access.isUsable, false);
});

test("a verified payment activates the plan and a repeat webhook grants no second period", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await startTrial(merchant._id, "BASIC");

  const transaction = await PaymentTransaction.create({
    merchant: merchant._id,
    planCode: "GROWTH",
    amount: 249900,
    providerOrderId: `order_${unique()}`,
    status: "CREATED"
  });

  const paymentId = `pay_${unique()}`;
  const first = await settleVerifiedPayment({ transaction, paymentId });
  assert.equal(first.alreadyPaid, false);

  const activated = await getCurrentSubscription(merchant._id);
  assert.equal(activated.status, "ACTIVE");
  assert.equal(activated.planCode, "GROWTH");
  assert.equal(activated.planSnapshot.currentAnnualPrice, 249900);
  const firstPeriodEnd = activated.currentPeriodEnd.getTime();

  // A repeated success webhook must not extend the period.
  const reloaded = await PaymentTransaction.findById(transaction._id);
  const second = await settleVerifiedPayment({ transaction: reloaded, paymentId });
  assert.equal(second.alreadyPaid, true);

  const again = await getCurrentSubscription(merchant._id);
  assert.equal(again.currentPeriodEnd.getTime(), firstPeriodEnd);
  assert.equal(await Subscription.countDocuments({ merchant: merchant._id, isCurrent: true }), 1);
});

test("a cancellation keeps access until the paid period ends", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  await activatePlan(merchant._id, "GROWTH");

  const subscription = await getCurrentSubscription(merchant._id);
  subscription.status = "CANCELLED";
  subscription.cancelAtPeriodEnd = true;
  subscription.autoRenew = false;
  subscription.cancelledAt = new Date();
  subscription.cancellationReason = "Not needed anymore";
  await subscription.save();

  const access = await resolveAccess(merchant._id);
  assert.equal(access.isUsable, true);
  assert.equal(access.cancelAtPeriodEnd, true);
  assert.equal(access.restrictions.includes("PLAN_INACTIVE"), false);
  assert.match(access.messages.join(" "), /cancellation has been scheduled/);

  // Only after the already-paid period really ends does access stop.
  subscription.currentPeriodEnd = daysAgo(1);
  await subscription.save();

  const expired = await resolveAccess(merchant._id);
  assert.equal(expired.status, "EXPIRED");
  assert.equal(expired.isUsable, false);
});

test("two payments cannot share a provider payment id", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();
  const paymentId = `pay_${unique()}`;

  await PaymentTransaction.create({
    merchant: merchant._id,
    planCode: "BASIC",
    amount: 99900,
    providerOrderId: `order_${unique()}`,
    providerPaymentId: paymentId,
    status: "PAID"
  });

  await assert.rejects(() =>
    PaymentTransaction.create({
      merchant: merchant._id,
      planCode: "BASIC",
      amount: 99900,
      providerOrderId: `order_${unique()}`,
      providerPaymentId: paymentId,
      status: "PAID"
    })
  );
});

test("several checkout transactions can coexist before a payment id exists", async (t) => {
  if (!dbReady) return t.skip("database not available");

  const merchant = await makeMerchant();

  await PaymentTransaction.create({
    merchant: merchant._id,
    planCode: "BASIC",
    amount: 99900,
    providerOrderId: `order_${unique()}`
  });
  await PaymentTransaction.create({
    merchant: merchant._id,
    planCode: "GROWTH",
    amount: 249900,
    providerOrderId: `order_${unique()}`
  });

  assert.equal(await PaymentTransaction.countDocuments({ merchant: merchant._id }), 2);
});
