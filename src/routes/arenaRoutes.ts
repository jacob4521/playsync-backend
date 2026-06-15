import express from "express";
import {
  authenticateToken,
  authorizeOwner,
} from "../middlewares/authMiddleware.js";
import {
  createArena,
  createCourt,
  getArenas,
  getCourts,
} from "../controllers/arenaController.js";

const router = express.Router();

router.post("/", authenticateToken, createArena);
router.get("/", getArenas);
router.post("/:id/courts", authenticateToken, authorizeOwner, createCourt);
router.get("/:id/courts", getCourts);

export default router;
