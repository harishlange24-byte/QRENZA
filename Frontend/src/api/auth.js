import client from "./client";

export function sendOtp(phone) {
  return client.post("/auth/send-otp", { phone });
}

export function verifyOtp(phone, otp) {
  return client.post("/auth/verify-otp", { phone, otp });
}

export function getMe() {
  return client.get("/auth/me");
}
