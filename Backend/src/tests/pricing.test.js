import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_PLANS } from "../config/plans.js";
import { computeTotals, resolveOffer, toPublicPlan } from "../services/pricing.service.js";

const planOf = (code) => DEFAULT_PLANS.find((plan) => plan.code === code);
const planObject = (code) => JSON.parse(JSON.stringify(planOf(code)));

test("every paid plan has the correct annual price in paise", () => {
  assert.equal(planOf("BASIC").currentAnnualPrice, 99900);
  assert.equal(planOf("GROWTH").currentAnnualPrice, 249900);
  assert.equal(planOf("PRO").currentAnnualPrice, 499900);
});

test("current and comparison prices are stored separately", () => {
  const totals = computeTotals(planObject("BASIC"));
  assert.equal(totals.amount, 99900);
  assert.equal(totals.referencePrice, 199900);
  assert.equal(totals.discountAmount, 100000);
  assert.equal(totals.offerActive, true);
});

test("payable amount is the current price and never the reference price", () => {
  const totals = computeTotals(planObject("GROWTH"));
  assert.equal(totals.payableAmount, 249900);
  assert.notEqual(totals.payableAmount, totals.referencePrice);
});

test("tax is split out of the price instead of being charged twice", () => {
  const totals = computeTotals(planObject("PRO"));
  assert.equal(totals.pricesIncludeTax, true);
  assert.equal(totals.baseAmount + totals.taxAmount, totals.amount);
  assert.equal(totals.payableAmount, totals.amount);
});

test("an expired offer removes the reference price without changing the price", () => {
  const plan = planObject("BASIC");
  plan.offerEnd = new Date(Date.now() - 60 * 1000);
  const totals = computeTotals(plan);
  assert.equal(totals.offerActive, false);
  assert.equal(totals.referencePrice, null);
  assert.equal(totals.discountAmount, 0);
  assert.equal(totals.payableAmount, 99900);
});

test("location limits match the published plans", () => {
  assert.equal(planOf("BASIC").maximumLocations, 1);
  assert.equal(planOf("GROWTH").maximumLocations, 3);
  assert.equal(planOf("PRO").maximumLocations, 6);
  assert.equal(planOf("ENTERPRISE").unlimitedLocations, true);
});

test("Growth and Pro advertise multi-branch GPS, Basic does not", () => {
  assert.equal(planOf("BASIC").features.includes("GPS_BRANCH_DETECTION"), false);
  assert.equal(planOf("GROWTH").features.includes("GPS_BRANCH_DETECTION"), true);
  assert.equal(planOf("PRO").features.includes("BRANCH_ANALYTICS"), true);
});

test("Enterprise is contact-only with custom pricing", () => {
  const totals = computeTotals(planObject("ENTERPRISE"));
  assert.equal(totals.contactOnly, true);
  assert.equal(totals.payableAmount, null);
  assert.equal(totals.displayPayable, "On request");
});

test("the public plan shape exposes both card and table data", () => {
  const publicPlan = toPublicPlan(planObject("GROWTH"));
  assert.equal(publicPlan.code, "GROWTH");
  assert.equal(publicPlan.unlimitedLocations, false);
  assert.equal(publicPlan.totals.payableAmount, 249900);
  assert.equal(publicPlan.recommended, true);
});

test("resolveOffer ignores a reference price lower than the selling price", () => {
  const offer = resolveOffer({ currentAnnualPrice: 100000, referenceAnnualPrice: 90000, offerStart: null, offerEnd: null });
  assert.equal(offer.discountAmount, 0);
  assert.equal(offer.offerActive, false);
});
