import { Server } from "socket.io";

// Realtime queue updates. The customer screen joins a room with the public store
// code, the merchant desk joins with the store id, so every change is broadcast
// to both keys.
let io = null;

const room = (key) => `store:${String(key)}`;

export function initRealtime(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: (process.env.CORS_ORIGINS || "http://localhost:5173 http://127.0.0.1:5173").split(" "),
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        socket.on("queue:join", (payload) => {
            const key = payload?.storeId;
            if (!key) {
                return;
            }
            socket.join(room(key));
        });
    });

    return io;
}

// Called by the queue controller after a write. A no-op while running without a
// socket server (for example inside the test suite).
export function emitQueueUpdate(storeId, publicCode) {
    if (!io) {
        return;
    }

    const payload = { storeId: String(storeId), at: Date.now() };

    io.to(room(storeId)).emit("queue:update", payload);

    if (publicCode) {
        io.to(room(publicCode)).emit("queue:update", payload);
    }
}

// Called by the order controller after a write. The customer screen and the
// merchant desk already share the same store room, so one broadcast reaches
// both: the customer sees their status change, the desk sees a new order.
export function emitOrderUpdate(storeId, publicCode) {
    if (!io) {
        return;
    }

    const payload = { storeId: String(storeId), at: Date.now() };

    io.to(room(storeId)).emit("order:update", payload);

    if (publicCode) {
        io.to(room(publicCode)).emit("order:update", payload);
    }
}
