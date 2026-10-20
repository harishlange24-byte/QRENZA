import client from "./client";

export function submitFeedback(code, payload) {
  return client.post(`/store/public/${code}/feedback`, payload);
}

export function listFeedback(storeId) {
  return client.get(`/store/${storeId}/feedback`);
}

export function listIssues(storeId) {
  return client.get(`/store/${storeId}/issues`);
}

export function respondIssue(storeId, issueId, payload) {
  return client.patch(`/store/${storeId}/issues/${issueId}`, payload);
}
