import client from "./client";

export function onboardMerchant(payload) {
  return client.post("/merchant/onboard", payload);
}

export function getMerchantMe() {
  return client.get("/merchant/me");
}
