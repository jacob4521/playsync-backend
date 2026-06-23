import axios from "axios";
import type { Request, Response } from "express";
import type { AuthenticateRequest } from "../middlewares/authMiddleware.js";

export const askAIAssistant = async (req: Request, res: Response) => {
  try {
    // Get the prompt prompt
    const userPrompt = req.body.prompt;
    if (!userPrompt || userPrompt.trim() === "") {
      return res.status(400).json({ error: "Invalid or missing prompt." });
    }

    // Send the prompt to the Python AI server using Axios
    const pythonResponse = await axios.post(
      "http://127.0.0.1:8000/ai/assistant",
      { prompt: userPrompt },
    );

    // sending the response back to the client
    res.status(200).json({ reply: pythonResponse.data.message });
  } catch (error) {
    // Error Handling
    console.error("Python AI Server Error:", error);
    res.status(500).json({ error: "AI Server is currently unreachable." });
  }
};

export const askAIAssistantProtected = async (
  req: AuthenticateRequest,
  res: Response,
) => {
  try {
    // Get the prompt prompt
    const userPrompt = req.body.prompt;
    if (!userPrompt || userPrompt.trim() === "") {
      return res.status(400).json({ error: "Invalid or missing prompt." });
    }

    // Extract user information from the authenticated request
    if (!req.user || typeof req.user === "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = req.user.userId;
    const chatHistory = req.body.chatHistory || [];
    if (!userId || !chatHistory) {
      return res.status(400).json({ error: "Missing user information." });
    }

    // Send the prompt, chatHistory and userId to the Python AI server using Axios
    const pythonResponse = await axios.post(
      `http://127.0.0.1:8000/ai/assistant/protected/${userId}`,
      { prompt: userPrompt, chatHistory, userId },
    );

    // return the response back to the client
    res.status(200).json({ reply: pythonResponse.data.message });
  } catch (error) {
    console.error("Python AI Server Error:", error);
    res.status(500).json({ error: "AI Server is currently unreachable." });
  }
};
