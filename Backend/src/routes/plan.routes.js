import express from "express";
import { listPlans } from "../controllers/subscription.controller.js";

const router = express.Router();

// Public plan catalogue used by the pricing page.
router.get("/", listPlans);

export default router;
