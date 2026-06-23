import express from "express";
import { verifyInternalServer } from "../middlewares/authMiddleware.js";
import { getBookingsByPlayerId } from "../controllers/bookingController.js";

const router = express.Router();

router.get("/bookings/:userId", verifyInternalServer, getBookingsByPlayerId);

export default router;
