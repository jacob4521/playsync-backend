// Middleware for authenticating requests using JWT tokens
import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { log } from "node:console";

export interface AuthenticateRequest extends Request {
  user?: string | jwt.JwtPayload;
}

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
    console.log(req.user);
  } catch (error) {
    return res.status(403).json({ error: "Access denied, invalid token." });
  }

  //   If the token is valid, call next()
  next();
};

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
