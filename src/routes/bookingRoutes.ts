import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { createBooking } from "../controllers/bookingController.js";

const router = express.Router();

router.post("/", authenticateToken, createBooking);

export default router;
