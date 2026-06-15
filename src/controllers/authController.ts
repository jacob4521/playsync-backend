import { type Request, type Response } from "express";
import zod from "zod";
import { prisma } from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthenticateRequest } from "../middlewares/authMiddleware.js";

export const registerUser = async (req: Request, res: Response) => {
  try {
    // Validate user input with zod
    const registerUserSchema = zod.object({
      name: zod.string().min(1, "Name is required"),
      email: zod.email("Invalid email address"),
      password: zod
        .string()
        .min(6, "Password must be at least 6 characters long"),
      role: zod.enum(["OWNER", "PLAYER"]).optional(),
    });

    const validationResult = registerUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(422).json(zod.treeifyError(validationResult.error));
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: validationResult.data.email,
      },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Hash the password with bcrypt
    const hashedPassword = await bcrypt.hash(
      validationResult.data.password,
      10,
    );

    // Create the user in the database with Prisma
    const newUser = await prisma.user.create({
      data: {
        name: validationResult.data.name,
        email: validationResult.data.email,
        password: hashedPassword,
        ...(validationResult.data.role
          ? { role: validationResult.data.role }
          : {}),
      },
    });

    // Respond with success message and user details (excluding password)
    res.status(201).json({
      message: "User registered successfully",
      newUser: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    // Extract email and password from the request body
    const { email, password } = req.body;

    // Validate user input with zod
    const loginUserSchema = zod.object({
      email: zod.email("Invalid email address"),
      password: zod.string().min(1, "Password is required"),
    });

    const validationResult = loginUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(422).json(zod.treeifyError(validationResult.error));
    }

    // Check if user exists in the database
    const user = await prisma.user.findUnique({
      where: {
        email: validationResult.data.email,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(
      validationResult.data.password,
      user.password,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // If authentication is successful, generate a JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      },
    );

    // Respond with success message and the JWT token
    res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMe = async (req: AuthenticateRequest, res: Response) => {
  // Get the user id from the req.user
  if (!req.user || typeof req.user === "string") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId } = req.user as { userId: string };

  // Fetch the user details from the database using the user id
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send the user details in the response(without the password)
    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
