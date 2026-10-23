import client from "./client";

export function sendOtp(phone) {
  return client.post("/auth/send-otp", { phone });
}

export function verifyOtp(phone, otp) {
  return client.post("/auth/verify-otp", { phone, otp });
}

// Only the platform console uses this one.
export function adminLogin(email, password) {
  return client.post("/auth/admin-login", { email, password });
}

export function getMe() {
  return client.get("/auth/me");
}

export function logout() {
  return client.post("/auth/logout");
}
