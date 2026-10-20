import client from "./client";

export function getCrmStats(storeId) {
  return client.get(`/store/${storeId}/crm`);
}

export function getCrmCustomers(storeId) {
  return client.get(`/store/${storeId}/crm/customers`);
}

export function getCustomerProfile(storeId, userId) {
  return client.get(`/store/${storeId}/crm/customers/${userId}`);
}

export function getAnalytics(storeId) {
  return client.get(`/store/${storeId}/analytics`);
}

export function listCampaigns(storeId) {
  return client.get(`/store/${storeId}/campaigns`);
}

export function createCampaign(storeId, payload) {
  return client.post(`/store/${storeId}/campaigns`, payload);
}
