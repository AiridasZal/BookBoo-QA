import { and, eq } from "drizzle-orm";
import express, { Request, Response, NextFunction } from "express";
import { BookWithAuthorsAndGenres } from "../types/BookAuthorGenre";
import {
  CollectionParamsSchema,
  addBookToCollectionBodySchema,
  createCollectionSchema,
  deleteBookFromCollectionParamsSchema,
  updateCollectionBodySchema,
} from "../types/validationSchemas";
import { db } from "./db/db";
import {
  Book,
  BookAuthor,
  BookGenre,
  Collection,
  CollectionBook,
  User,
} from "./db/schema";
import { authMiddleware } from "./middlewares/authMiddleware";

const router = express.Router();

export default router;
