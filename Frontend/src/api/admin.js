import client from "./client";

export function getAdminOverview() {
  return client.get("/admin/overview");
}

export function listAdminMerchants(params) {
  return client.get("/admin/merchants", { params });
}

export function getAdminMerchant(id) {
  return client.get(`/admin/merchants/${id}`);
}

export function updateAdminMerchant(id, payload) {
  return client.patch(`/admin/merchants/${id}`, payload);
}

export function deleteAdminMerchant(id) {
  return client.delete(`/admin/merchants/${id}`);
}

export function listAdminStores(params) {
  return client.get("/admin/stores", { params });
}

export function updateAdminStore(id, payload) {
  return client.patch(`/admin/stores/${id}`, payload);
}

export function deleteAdminStore(id) {
  return client.delete(`/admin/stores/${id}`);
}

export function listAdminUsers(params) {
  return client.get("/admin/users", { params });
}

export function updateAdminUser(id, payload) {
  return client.patch(`/admin/users/${id}`, payload);
}

export function deleteAdminUser(id) {
  return client.delete(`/admin/users/${id}`);
}

export function getAdminAlerts() {
  return client.get("/admin/alerts");
}

export function listAdminAuditLogs(params) {
  return client.get("/admin/audit-logs", { params });
}
