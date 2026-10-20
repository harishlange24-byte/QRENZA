import client from "./client";

// Guests order too, so the phone travels along and identifies their own orders.
export function placeOrder(code, payload) {
  return client.post(`/store/public/${code}/orders`, payload);
}

export function getMyOrders(code, phone) {
  return client.get(`/store/public/${code}/orders`, { params: phone ? { phone } : {} });
}

export function cancelMyOrder(code, orderId, phone) {
  return client.post(`/store/public/${code}/orders/${orderId}/cancel`, { phone });
}

export function listStoreOrders(storeId, status) {
  return client.get(`/store/${storeId}/orders`, { params: status ? { status } : {} });
}

export function updateOrderStatus(storeId, orderId, status) {
  return client.patch(`/store/${storeId}/orders/${orderId}`, { status });
}
