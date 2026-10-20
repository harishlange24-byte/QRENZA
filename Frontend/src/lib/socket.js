import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket) {
    socket = io("/", { autoConnect: false, withCredentials: true });
  }
  return socket;
}

export function joinStoreRoom(storeId) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("queue:join", { storeId });
  return s;
}
