import express from "express";
import {
  getMe,
  loginUser,
  registerUser,
} from "../controllers/authController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { createArena } from "../controllers/arenaController.js";

const router = express.Router();

router.post("/", authenticateToken, createArena);

export default router;
