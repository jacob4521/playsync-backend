// Middleware for authenticating requests using JWT tokens
import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticateRequest extends Request {
  user?: string | jwt.JwtPayload | { userId: string };
}

// Middleware function to authenticate JWT tokens
export const authenticateToken = (
  req: AuthenticateRequest,
  res: Response,
  next: NextFunction,
) => {
  // Get the token from the Authorization header
  const authHeader = req.headers.authorization;

  //   If no bearer prefix is found or no token is provided, return 401 Unauthorized
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Extract the token by removing the "Bearer " prefix
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied, token missing." });
  }

  // Validate the token using the JWT secret key
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
  } catch (error) {
    return res.status(403).json({ error: "Access denied, invalid token." });
  }

  //   If the token is valid, call next()
  next();
};

// Middleware to authorize only users with the "OWNER" role to perform certain actions
export const authorizeOwner = (
  req: AuthenticateRequest,
  res: Response,
  next: NextFunction,
) => {
  // Check if the user is authenticated and has the "OWNER" role
  const user = req.user as { userId: string; role: string } | undefined;

  if (!user || user.role !== "OWNER") {
    return res
      .status(403)
      .json({ error: "Forbidden: Only owners can perform this action." });
  }

  next();
};

export const verifyInternalServer = (
  req: AuthenticateRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the secret from the request header 'x-internal-secret'
    const internalSecret = req.headers["x-internal-secret"] as string;

    // Check if the secret is present and matches the expected value from environment variables
    if (!internalSecret || internalSecret !== process.env.INTERNAL_SERVER_KEY) {
      return res
        .status(403)
        .json({ error: "Forbidden: Invalid internal signature" });
    }

    // Get the userId from the request parameters
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: "Bad Request: Missing userId" });
    }

    // Add the user id in the req.user object for the next function to use
    req.user = { userId };

    next();
  } catch (error) {
    console.error("Internal Auth Error:", error);
    return res
      .status(500)
      .json({ error: "Internal server authentication failed" });
  }
};
