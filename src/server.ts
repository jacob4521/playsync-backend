import express from "express";
import authRoutes from "./routes/authRoutes.js";
import arenaRoutes from "./routes/arenaRoutes.js";

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Create an instance of the express application
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Add JSON body parser for POST requests

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/auth", authRoutes);
app.use("/arenas", arenaRoutes);

// Start and listen on the port
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
