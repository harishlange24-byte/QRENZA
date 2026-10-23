import client from "./client";

export function getCrmStats(storeId) {
  return client.get(`/store/${storeId}/crm`);
}

export function getCrmCustomers(storeId, search) {
  return client.get(`/store/${storeId}/crm/customers`, { params: search ? { search } : {} });
}

export function getCustomerProfile(storeId, userId) {
  return client.get(`/store/${storeId}/crm/customers/${userId}`);
}

// One call fills the home screen: the number boxes plus a week of trend.
export function getDashboard(storeId) {
  return client.get(`/store/${storeId}/dashboard`);
}

export function getAnalytics(storeId, days) {
  return client.get(`/store/${storeId}/analytics`, { params: days ? { days } : {} });
}
