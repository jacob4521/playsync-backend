import express from "express";
import { verifyInternalServer } from "../middlewares/authMiddleware.js";
import {
  getAvailability,
  getBookingsByPlayerId,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/bookings/:userId", verifyInternalServer, getBookingsByPlayerId);
router.get("/availability", verifyInternalServer, getAvailability);

export default router;
