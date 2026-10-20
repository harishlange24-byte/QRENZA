import client from "./client";

export function createStore(payload) {
  return client.post("/store", payload);
}

export function listStores() {
  return client.get("/store");
}

export function getStoreQr(storeId) {
  return client.get(`/store/${storeId}/qr`);
}

export function getPublicStore(code) {
  return client.get(`/store/public/${code}`);
}

export function getPublicTable(code, tableNumber) {
  return client.get(`/store/public/${code}/t/${tableNumber}`);
}
