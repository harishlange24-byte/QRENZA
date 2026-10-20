import client from "./client";

export function joinQueue(code, payload) {
  return client.post(`/store/public/${code}/queue/join`, payload);
}

// Guests have no session, so the phone is sent along to find their own entry.
export function getMyQueue(code, phone) {
  return client.get(`/store/public/${code}/queue/me`, { params: phone ? { phone } : {} });
}

export function getMerchantQueue(storeId) {
  return client.get(`/store/${storeId}/queue`);
}

export function callNext(storeId) {
  return client.post(`/store/${storeId}/queue/next`);
}

export function skipEntry(storeId, entryId) {
  return client.post(`/store/${storeId}/queue/${entryId}/skip`);
}

export function serveEntry(storeId, entryId) {
  return client.post(`/store/${storeId}/queue/${entryId}/serve`);
}

export function cancelEntry(code, phone) {
  return client.post(`/store/public/${code}/queue/cancel`, { phone });
}
