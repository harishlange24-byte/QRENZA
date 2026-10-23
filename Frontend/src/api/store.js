import client from "./client";

export function createStore(payload) {
  return client.post("/store", payload);
}

export function listStores() {
  return client.get("/store");
}

export function updateStore(storeId, payload) {
  return client.patch(`/store/${storeId}`, payload);
}

export function deleteStore(storeId) {
  return client.delete(`/store/${storeId}`);
}

export function getStoreQr(storeId) {
  return client.get(`/store/${storeId}/qr`);
}

export function getPublicStore(code) {
  return client.get(`/store/public/${code}`);
}

// Every shop on Qrenza. A session adds the customer's own numbers per shop.
export function listPublicStores() {
  return client.get("/store/public");
}

export function getPublicTable(code, tableNumber) {
  return client.get(`/store/public/${code}/t/${tableNumber}`);
}
