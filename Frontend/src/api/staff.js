import client from "./client";

export function listStaff(storeId) {
  return client.get(`/store/${storeId}/staff`);
}

export function addStaff(storeId, payload) {
  return client.post(`/store/${storeId}/staff`, payload);
}
