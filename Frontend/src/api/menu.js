import client from "./client";

export function getPublicMenu(code) {
  return client.get(`/store/public/${code}/menu`);
}

export function getMerchantMenu(storeId) {
  return client.get(`/store/${storeId}/menu`);
}

export function createCategory(storeId, payload) {
  return client.post(`/store/${storeId}/menu/categories`, payload);
}

export function createItem(storeId, payload) {
  return client.post(`/store/${storeId}/menu/items`, payload);
}

export function updateItem(storeId, itemId, payload) {
  return client.patch(`/store/${storeId}/menu/items/${itemId}`, payload);
}
