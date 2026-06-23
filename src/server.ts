import express from "express";
import authRoutes from "./routes/authRoutes.js";
import arenaRoutes from "./routes/arenaRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Create an instance of the express application
const app = express();
const port = process.env.PORT || 3000;

// Use the payment routes for handling payment-related endpoints
app.use("/payments", paymentRoutes);

app.use(express.json()); // Add JSON body parser for POST requests

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/auth", authRoutes);
app.use("/arenas", arenaRoutes);
app.use("/bookings", bookingRoutes);
app.use("/ai", aiRoutes);
app.use("/internal", internalRoutes);

// Start and listen on the port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
