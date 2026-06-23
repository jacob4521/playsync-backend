import express from "express";
import {
  askAIAssistant,
  askAIAssistantProtected,
} from "../controllers/aiController.js";
import { authenticateToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/assistant", askAIAssistant);
router.post("/assistant/protected", authenticateToken, askAIAssistantProtected);

export default router;
