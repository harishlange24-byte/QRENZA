import client from "./client";

export function listSupplyCatalog() {
  return client.get("/store/supplies");
}

export function listSupplyOrders() {
  return client.get("/store/supplies/orders");
}

export function createSupplyOrder(payload) {
  return client.post("/store/supplies/orders", payload);
}

export function cancelSupplyOrder(orderId) {
  return client.post(`/store/supplies/orders/${orderId}/cancel`);
}
