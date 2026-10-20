import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

dotenv.config();

import { healthCheck } from "./controllers/health.controller.js";
import authRoutes from "./routes/auth.routes.js";
import merchantRoutes from "./routes/merchant.routes.js";
import storeRoutes from "./routes/store.routes.js";
import planRoutes from "./routes/plan.routes.js";
import subscriptionRoutes from "./routes/subscription.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import billingAdminRoutes from "./routes/billingAdmin.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

app.use(helmet());

// // The Vite dev server runs on http, so the scheme matters here. CORS_ORIGINS
// // is a space separated list so deployed frontends can be added on.
// const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173 http://127.0.0.1:5173").split(" ");

// app.use(cors({
//     origin:allowedOrigins,
//     credentials:true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
// }))
app.use(
  cors({
    origin: "https://qrenza.vercel.app",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Keep the raw body so payment provider webhooks can be signature verified.
app.use(express.json({
    verify:(req,res,buf)=>{
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

const appLimitter = rateLimit({
    windowMs : 15 * 60 *1000,
    max:200,
    message:{
        success:false,
        message:"Too many requests, please try again later."
    }
})

app.use("/api",appLimitter);
app.use("/api/health", healthCheck);
app.use("/api/auth",authRoutes);
app.use("/api/merchant",merchantRoutes);
app.use("/api/store",storeRoutes);
app.use("/api/plans",planRoutes);
app.use("/api/subscription",subscriptionRoutes);
app.use("/api/billing",billingRoutes);
app.use("/api/admin/billing",billingAdminRoutes);
app.use("/api/admin",adminRoutes);

export default app;