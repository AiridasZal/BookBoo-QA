import bodyParser from "body-parser";
import { eq } from "drizzle-orm";
import express, { Request, Response } from "express";
import { Webhook } from "svix";
import { WebhookEvent } from "../types/WebhookEvent";
import { db } from "./db/db";
import { InsertUser, User } from "./db/schema";

const router = express.Router();

router.post(
  "/api/webhooks",
  bodyParser.raw({ type: "application/json" }),
  async function (req: Request, res: Response) {
    const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      throw new Error("You need a WEBHOOK_SECRET in your .env");
    }

    const headers = req.headers;
    const payload = req.body;

    // Get the Svix headers for verification
    const svix_id = headers["svix-id"] as string;
    const svix_timestamp = headers["svix-timestamp"] as string;
    const svix_signature = headers["svix-signature"] as string;

    // If there are missing Svix headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error occured -- no svix headers", {
        status: 400,
      });
    }

    // Initiate Svix
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    // Attempt to verify the incoming webhook
    // If successful, the payload will be available from 'evt'
    // If the verification fails, error out and return error code
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err: any) {
      // Console log and return error
      console.log("Webhook failed to verify. Error:", err.message);
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // Grab the ID and TYPE of the Webhook
    const { id } = evt.data;
    const eventType = evt.type;

    if (!id || !eventType) {
      return res.status(400).json({
        success: false,
        message: "Webhook missing ID or type",
      });
    }

    console.log(`Webhook with an ID of ${id} and type of ${eventType}`);
    // Payload preview
    console.log("Webhook body:", evt.data);

    if (eventType === "user.created") {
      const user_id = evt.data.id;
      const username = evt.data.username;

      const insertUser: InsertUser = {
        id: user_id,
        username: username || "BookBooUser",
      };

      try {
        await db.insert(User).values(insertUser).execute();
        console.log("User inserted:", id);
      } catch (error) {
        console.error("Error inserting user into database:", error);
      }
    }

    if (eventType === "user.deleted") {
      const user_id = evt.data.id;
      if (typeof user_id !== "string") {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      try {
        await db.delete(User).where(eq(User.id, user_id)).execute();
        console.log("User deleted:", id);
      } catch (error) {
        console.error("Error deleting user from database:", error);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  }
);

export default router;
