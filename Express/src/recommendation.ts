import { inArray } from "drizzle-orm";
import express, { Request, Response } from "express";
import fetch from "node-fetch";
import { bookRecommendationRequestSchema } from "../types/validationSchemas";
import { db } from "./db/db";
import { Book, BookAuthor, BookGenre } from "./db/schema";

const router = express.Router();

export default router;
