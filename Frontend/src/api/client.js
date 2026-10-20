import axios from "axios";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" }
});

export function getErrorMessage(error) {
  const serverMessage = error?.response?.data?.message;
  if (serverMessage) return serverMessage;

  const status = error?.response?.status;
  if (error?.code === "ERR_NETWORK" || status === 500 || status === 502 || status === 503 || status === 504) {
    return "Can't reach the Qrenza server. Check that the backend is running.";
  }

  return error?.message || "Request failed";
}

export default client;
