import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Dummy values only. These tests never talk to Razorpay and never move money.
process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";
process.env.RAZORPAY_KEY_SECRET = "dummy_key_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "dummy_webhook_secret";

import * as razorpay from "../services/razorpay.service.js";

const sign = (payload, secret) => crypto.createHmac("sha256", secret).update(payload).digest("hex");

test("configured keys are detected", () => {
  assert.equal(razorpay.isConfigured(), true);
  assert.equal(razorpay.isWebhookConfigured(), true);
  assert.equal(razorpay.getPublicKeyId(), "rzp_test_dummy");
});

test("a correctly signed checkout payment is accepted", () => {
  const orderId = "order_test_1";
  const paymentId = "pay_test_1";
  const signature = sign(`${orderId}|${paymentId}`, process.env.RAZORPAY_KEY_SECRET);
  assert.equal(razorpay.verifyPaymentSignature({ orderId, paymentId, signature }), true);
});

test("an invalid or tampered checkout signature is rejected", () => {
  assert.equal(
    razorpay.verifyPaymentSignature({ orderId: "order_test_2", paymentId: "pay_test_2", signature: "deadbeef" }),
    false
  );
  const orderId = "order_test_3";
  const paymentId = "pay_test_3";
  const wrongSignature = sign(`${orderId}|${paymentId}`, "some_other_secret");
  assert.equal(razorpay.verifyPaymentSignature({ orderId, paymentId, signature: wrongSignature }), false);
});

test("a missing signature is rejected instead of throwing", () => {
  assert.equal(razorpay.verifyPaymentSignature({ orderId: "a", paymentId: "b", signature: "" }), false);
  assert.equal(razorpay.verifyPaymentSignature({}), false);
});

test("a correctly signed webhook body is accepted", () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured", payload: {} }));
  const signature = sign(rawBody, process.env.RAZORPAY_WEBHOOK_SECRET);
  assert.equal(razorpay.verifyWebhookSignature(rawBody, signature), true);
});

test("an unsigned or mismatched webhook body is rejected", () => {
  const rawBody = Buffer.from(JSON.stringify({ event: "payment.captured" }));
  assert.equal(razorpay.verifyWebhookSignature(rawBody, ""), false);
  assert.equal(razorpay.verifyWebhookSignature(rawBody, "not_the_signature"), false);
  const signature = sign(rawBody, "another_secret");
  assert.equal(razorpay.verifyWebhookSignature(rawBody, signature), false);
});

test("creating an order without credentials fails safely", async () => {
  const savedKey = process.env.RAZORPAY_KEY_ID;
  const savedSecret = process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;

  assert.equal(razorpay.isConfigured(), false);
  await assert.rejects(
    () => razorpay.createOrder({ amount: 99900, currency: "INR" }),
    (error) => error.code === "RAZORPAY_NOT_CONFIGURED"
  );

  process.env.RAZORPAY_KEY_ID = savedKey;
  process.env.RAZORPAY_KEY_SECRET = savedSecret;
  assert.equal(razorpay.isConfigured(), true);
});
