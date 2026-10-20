import client from "./client";

// Every scan of the store page counts as a visit and may hand out a card.
export function recordVisit(code) {
  return client.post(`/store/public/${code}/visit`);
}

export function getMyGiftCards(code) {
  return client.get(`/store/public/${code}/gift-cards`);
}

export function listStoreGiftCards(storeId) {
  return client.get(`/store/${storeId}/gift-cards`);
}

export function createGiftCard(storeId, payload) {
  return client.post(`/store/${storeId}/gift-cards`, payload);
}
