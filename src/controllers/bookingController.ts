import { type Response } from "express";
import type { AuthenticateRequest } from "../middlewares/authMiddleware.js";
import zod from "zod";
import { prisma } from "../config/prisma.js";

export const createBooking = async (
  req: AuthenticateRequest,
  res: Response,
) => {
  try {
    // Get the userId we have to use the usrId as playerId
    if (!req.user || typeof req.user === "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // create the zod schema to validate the request body
    const createBookingSchema = zod.object({
      courtId: zod.cuid2(),
      date: zod.coerce.date(),
      startTime: zod.coerce.date(),
      endTime: zod.coerce.date(),
    });

    // Validate those with zod
    const validationResult = createBookingSchema.safeParse(req.body);

    // If the validation fails, return a 422 error with the validation errors
    if (!validationResult.success) {
      return res.status(422).json(zod.treeifyError(validationResult.error));
    }

    const { date, startTime, endTime, courtId } = validationResult.data;

    // Check if the startTime is in the future
    const now = new Date();
    if (startTime < now) {
      return res.status(400).json({ error: "Cannot book a time in the past" });
    }

    // validate the chosen hours (1hrs min & 4hrs max) and should be in the multiple of 1hrs
    const durationInHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationInHours < 1 || durationInHours > 4) {
      return res
        .status(422)
        .json({ error: "Booking duration must be between 1 and 4 hours" });
    }

    if (durationInHours % 1 !== 0) {
      return res
        .status(422)
        .json({ error: "Booking duration must be in multiples of 1 hour" });
    }

    // Get the userId from the request object
    const playerId = req.user.userId;

    // Check if the court is available for the chosen date and time
    const overlappingBookings = await prisma.booking.findMany({
      where: {
        courtId: courtId,
        date: date,

        // Overlap Conditions දෙක
        startTime: {
          // [ඔයාගේ කෝඩ් එක: අලුත් endTime එකට වඩා අඩුයි කියලා (lt) ලියන්න]
          lt: endTime,
        },
        endTime: {
          // [ඔයාගේ කෝඩ් එක: අලුත් startTime එකට වඩා වැඩියි කියලා (gt) ලියන්න]
          gt: startTime,
        },
      },
    });

    if (overlappingBookings.length > 0) {
      return res
        .status(409)
        .json({ error: "The court is not available for the chosen time slot" });
    }

    // Calculate the total amount for the booking
    const court = await prisma.court.findUnique({
      where: {
        id: courtId,
      },
    });

    if (!court) {
      return res.status(404).json({ error: "Court not found" });
    }

    const totalAmount = durationInHours * court.pricePerHour;

    // If the court is available, create the booking
    const booking = await prisma.booking.create({
      data: {
        playerId,
        courtId,
        date,
        startTime,
        endTime,
        totalAmount,
      },
    });
    return res.status(201).json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
