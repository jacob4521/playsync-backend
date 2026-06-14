import { type Response } from "express";
import type { AuthenticateRequest } from "../middlewares/authMiddleware.js";
import zod from "zod";
import { prisma } from "../config/prisma.js";
import type { Role } from "../generated/prisma/enums.js";

export const createArena = async (req: AuthenticateRequest, res: Response) => {
  try {
    // Get teh userId and the role from the req.user object
    if (!req.user || typeof req.user === "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId, role } = req.user as { userId: string; role: Role };

    // Do the role check and check if its "OWNER"
    if (role !== "OWNER") {
      return res.status(403).json({ error: "Only owners can create arenas" });
    }

    // Get the details from the request body
    const { name, description, address, latitude, longitude } = req.body;

    // Validate those with zod
    const createArenaSchema = zod.object({
      name: zod.string().min(1, "Name is required"),
      description: zod.string().optional(),
      address: zod.string().min(1, "Address is required"),
      latitude: zod.number().min(-90).max(90),
      longitude: zod.number().min(-180).max(180),
    });

    const validationResult = createArenaSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(422).json(zod.treeifyError(validationResult.error));
    }

    // Create the arena and return the response
    const newArena = await prisma.arena.create({
      data: {
        name: validationResult.data.name,
        description: validationResult.data.description ?? null,
        address: validationResult.data.address,
        latitude: validationResult.data.latitude,
        longitude: validationResult.data.longitude,
        ownerId: userId,
      },
    });

    return res.status(201).json({
      message: "Arena created successfully",
      arena: {
        name: newArena.name,
        description: newArena.description,
        address: newArena.address,
        latitude: newArena.latitude,
        longitude: newArena.longitude,
      },
    });
  } catch (error) {
    console.error("Error creating arena:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
