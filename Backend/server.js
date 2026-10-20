import http from "http";
import app from "./src/app.js";
import ConnectDB from "./src/config/db.js";
import { initRealtime } from "./src/realtime.js";

ConnectDB();

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io shares the same HTTP server so the queue desk and the customer
// screen stay in sync without polling.
initRealtime(server);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
