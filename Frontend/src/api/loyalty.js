import client from "./client";

export function getMyLoyalty(code) {
  return client.get(`/store/public/${code}/loyalty`);
}

export function addStamp(storeId, payload) {
  return client.post(`/store/${storeId}/loyalty/stamps`, payload);
}

export function getLoyaltyProgram(storeId) {
  return client.get(`/store/${storeId}/loyalty`);
}

export function upsertLoyaltyProgram(storeId, payload) {
  return client.put(`/store/${storeId}/loyalty`, payload);
}

// The scratch card is geofenced, so the customer coordinates travel with it.
export function scratchReward(code, coords) {
  return client.post(`/store/public/${code}/scratch`, coords || {});
}

export function getMyRewards(code) {
  return client.get(`/store/public/${code}/rewards`);
}

export function listRewards(storeId) {
  return client.get(`/store/${storeId}/rewards`);
}

export function createReward(storeId, payload) {
  return client.post(`/store/${storeId}/rewards`, payload);
}

export function redeemClaim(storeId, code) {
  return client.post(`/store/${storeId}/rewards/redeem`, { code });
}
