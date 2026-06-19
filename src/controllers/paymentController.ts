import type { Response } from "express";
import type { AuthenticateRequest } from "../middlewares/authMiddleware.js";
import zod from "zod";
import { prisma } from "../config/prisma.js";
import Stripe from "stripe";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export const checkoutSession = async (
  req: AuthenticateRequest,
  res: Response,
) => {
  try {
    //  Get the userId cause it is alraedy authenticated
    if (!req.user || typeof req.user === "string") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = req.user as { userId: string };

    // We need to get the bookingId from the request body
    const { bookingId } = req.body;

    // validate using zod
    const checkoutSessionSchema = zod.object({
      bookingId: zod.cuid2(),
    });

    const validationResult = checkoutSessionSchema.safeParse({ bookingId });

    if (!validationResult.success) {
      return res.status(422).json(zod.treeifyError(validationResult.error));
    }

    // We need to check the bookingId validity by checking if a pending booking exists for the exact user
    const booking = await prisma.booking.findFirst({
      where: {
        id: validationResult.data.bookingId,
        playerId: userId,
        status: "PENDING",
      },
      include: {
        court: {
          select: {
            name: true,
            pricePerHour: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Calculate the booking duration in hours
    const bookingDurationInHours =
      (booking.endTime.getTime() - booking.startTime.getTime()) / 3600000;

    // Create a checkout session with Stripe
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      ui_mode: "hosted_page",
      success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `Booking for ${booking.court.name}`,
            },
            unit_amount: Math.round(
              booking.court.pricePerHour * 100 * bookingDurationInHours,
            ),
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: booking.id,
      },
    });

    // Return the session ID to the client
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
