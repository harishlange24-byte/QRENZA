import client from "./client";

export function getPlans() {
  return client.get("/plans");
}

export function getMySubscription() {
  return client.get("/subscription/me");
}

export function getSubscriptionHistory() {
  return client.get("/subscription/history");
}

export function startTrial(planCode) {
  return client.post("/subscription/trial", { planCode });
}

export function createCheckout(planCode) {
  return client.post("/billing/checkout", { planCode });
}

export function verifyCheckout(payload) {
  return client.post("/billing/verify", payload);
}

export function cancelSubscription(reason) {
  return client.post("/billing/cancel", { reason });
}

export function requestPlanChange(planCode, note) {
  return client.post("/billing/plan-change", { planCode, note });
}

export function requestEnterpriseQuote(payload) {
  return client.post("/billing/enterprise", payload);
}

export function requestRefund(payload) {
  return client.post("/billing/refunds", payload);
}
