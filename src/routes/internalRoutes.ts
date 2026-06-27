import express from "express";
import {
  verifyInternalServer,
  authenticateToken,
} from "../middlewares/authMiddleware.js";
import {
  createBooking,
  getAvailability,
  getBookingsByPlayerId,
} from "../controllers/bookingController.js";
import { getArenas } from "../controllers/arenaController.js";

const router = express.Router();

router.get("/bookings/:userId", verifyInternalServer, getBookingsByPlayerId);
router.get("/availability", verifyInternalServer, getAvailability);
router.get("/arenas", verifyInternalServer, getArenas);
router.post(
  "/add-booking",
  verifyInternalServer,
  authenticateToken,
  createBooking,
);

export default router;
