import crypto from "node:crypto";

// Razorpay integration. All secrets stay on the backend. When credentials are
// missing we never pretend the checkout works, callers get NOT_CONFIGURED.
function keys() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || ""
  };
}

export function isConfigured() {
  const { keyId, keySecret } = keys();
  return Boolean(keyId && keySecret);
}

export function isWebhookConfigured() {
  return Boolean(keys().webhookSecret);
}

export function getPublicKeyId() {
  return keys().keyId;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ""));
  const right = Buffer.from(String(b ?? ""));
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const { keySecret } = keys();
  if (!keySecret || !orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return safeEqual(expected, signature);
}

// Razorpay signs the raw request body, so the route must hand over the exact bytes.
export function verifyWebhookSignature(rawBody, signature) {
  const { webhookSecret } = keys();
  if (!webhookSecret || !signature || !rawBody) return false;

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return safeEqual(expected, signature);
}

async function razorpayRequest(path, payload) {
  if (!isConfigured()) {
    const error = new Error("Razorpay is not configured");
    error.code = "RAZORPAY_NOT_CONFIGURED";
    throw error;
  }

  const { keyId, keySecret } = keys();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error?.description || "Razorpay request failed");
    error.code = "RAZORPAY_REQUEST_FAILED";
    error.providerCode = data?.error?.code || "";
    throw error;
  }

  return data;
}

export function createOrder({ amount, currency, receipt, notes }) {
  return razorpayRequest("orders", {
    amount,
    currency,
    receipt,
    notes,
    payment_capture: 1
  });
}

export function createRefund({ paymentId, amount, notes }) {
  return razorpayRequest(`payments/${paymentId}/refund`, { amount, notes });
}
