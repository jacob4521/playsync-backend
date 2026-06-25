import { type Request, type Response } from "express";
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

export const getArenas = async (req: Request, res: Response) => {
  try {
    // Get the query parameters lat, lon, radius and the pagination parameters page and limit
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon as string) : undefined;
    const radius = req.query.radius
      ? parseFloat(req.query.radius as string)
      : 10;

    if (!lat || !lon) {
      // Return all the arenas if the latitude, longitude, or radius is not provided with pagination
      // Also return a list of court available for each arena
      const arenas = await prisma.arena.findMany({
        skip: (page - 1) * limit,
        take: limit,

        select: {
          id: true,
          name: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          courts: {
            select: {
              id: true,
              name: true,
              sportType: true,
              pricePerHour: true,
            },
          },
        },
      });
      console.log(arenas);

      return res.status(200).json({ arenas });
    } else if (lat && lon && radius) {
      // Return the nearest arenas within the provided radius

      const offset = (page - 1) * limit;

      const arenas = await prisma.$queryRaw`
        SELECT
          a.id, a.name, a.description, a.address, a.latitude, a.longitude,
          COALESCE(
            json_agg(
              json_build_object(
                'id', c.id,
                'name', c.name,
                'sportType', c."sportType",
                'pricePerHour', c."pricePerHour"
              )
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'
          ) AS courts,
          ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( a.latitude ) ) * cos( radians( a.longitude ) - radians(${lon}) ) + sin( radians(${lat}) ) * sin( radians( a.latitude ) ) ) ) AS distance
        FROM "Arena" a
        LEFT JOIN "Court" c ON c."arenaId" = a.id
        WHERE ( 6371 * acos( cos( radians(${lat}) ) * cos( radians( a.latitude ) ) * cos( radians( a.longitude ) - radians(${lon}) ) + sin( radians(${lat}) ) * sin( radians( a.latitude ) ) ) ) <= ${radius}
        GROUP BY a.id, a.name, a.description, a.address, a.latitude, a.longitude
        ORDER BY distance ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      return res.status(200).json({ arenas });
    }
  } catch (error) {
    console.error("Error fetching arenas:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createCourt = async (req: AuthenticateRequest, res: Response) => {
  try {
    // Get the userId from the req.user object
    if (!req.user || typeof req.user === "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = req.user;

    // Get the arenaId from the req.params
    const { id: arenaId } = req.params;

    if (typeof arenaId !== "string") {
      return res.status(400).json({ error: "Invalid arena ID" });
    }

    // Get the details from the request body and validate them with zod
    const createCourtSchema = zod.object({
      name: zod.string().min(1, "Court name is required"),
      pricePerHour: zod.number().min(1, "Price per hour is required"),
      sportType: zod.enum(["FUTSAL", "BADMINTON", "BASKETBALL", "CRICKET"]),
    });

    const validationResult = createCourtSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(422).json(zod.treeifyError(validationResult.error));
    }

    // Check if the arena exists and if the user is the owner of the arena
    const arena = await prisma.arena.findUnique({
      where: {
        id: arenaId,
      },
    });

    if (!arena) {
      return res.status(404).json({ error: "Arena not found" });
    }

    if (arena.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: You do not own this arena" });
    }

    // Create the court and return the response
    const newCourt = await prisma.court.create({
      data: {
        name: validationResult.data.name,
        pricePerHour: validationResult.data.pricePerHour,
        sportType: validationResult.data.sportType,
        arenaId: arenaId,
      },
    });

    // Return the success response
    return res.status(201).json({
      message: "Court created successfully",
      court: {
        name: newCourt.name,
        pricePerHour: newCourt.pricePerHour,
        sportType: newCourt.sportType,
      },
    });
  } catch (error) {
    console.error("Error creating court:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getCourts = async (req: Request, res: Response) => {
  try {
    const arenaId = req.params.id as string;

    // Get the courts for the arenaId from the database
    const courts = await prisma.court.findMany({
      where: {
        arenaId,
      },
    });

    return res.status(200).json({ courts });
  } catch (error) {
    console.error("Error fetching courts:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
