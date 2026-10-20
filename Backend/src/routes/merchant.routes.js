import express from "express";
import { CreateMerchant, getMerchantMe } from "../controllers/merchant.controller.js";
import { protect} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/onboard",protect,CreateMerchant);
router.get("/me",protect,getMerchantMe);

export default router;