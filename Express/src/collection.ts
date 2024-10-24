import { and, eq } from "drizzle-orm";
import express, { NextFunction, Request, Response } from "express";
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

router.get("/api/collection", async (req, res) => {
  try {
    const publicCollections = await db
      .select({
        id: Collection.id,
        name: Collection.name,
        creatorName: User.username,
      })
      .from(Collection)
      .innerJoin(User, eq(User.id, Collection.user_id))
      .where(eq(Collection.public, true))
      .execute();

    if (!publicCollections.length) {
      return res.status(404).json({ message: "No public collections found" });
    }

    res.json(publicCollections);
  } catch (error) {
    console.error("Error fetching public collections:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/api/users/:userId/collections",
  authMiddleware,
  async (req, res) => {
    const { userId } = req.params;

    if (req.auth?.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: User ID mismatch" });
    }

    try {
      const userCollections = await db
        .select({
          id: Collection.id,
          name: Collection.name,
          public: Collection.public,
        })
        .from(Collection)
        .where(eq(Collection.user_id, userId))
        .execute();

      if (!userCollections.length) {
        return res.status(404).json({ message: "No collections found" });
      }

      res.json(userCollections);
    } catch (error) {
      console.error("Error fetching user collections:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

const checkPublicCollection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { collectionId } = req.params;

  try {
    const collection = await db
      .select()
      .from(Collection)
      .where(eq(Collection.id, parseInt(collectionId)))
      .execute();

    if (collection.length && collection[0].public) {
      if (req.headers.authorization) {
        await authMiddleware(req, res, () => next());
      } else {
        next();
      }
    } else {
      await authMiddleware(req, res, next);
    }
  } catch (error) {
    console.error("Error checking collection:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

router.get(
  "/api/collection/:collectionId",
  checkPublicCollection,
  async (req: Request, res: Response) => {
    const { collectionId } = req.params;

    try {
      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, parseInt(collectionId)))
        .execute();

      if (!collection.length) {
        return res.status(404).json({
          error: "Collection not found",
        });
      }

      const isOwner = collection[0].user_id === req.auth?.userId;
      if (!collection[0].public && !isOwner) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      const booksInCollection: BookWithAuthorsAndGenres[] = await db
        .select({
          id: Book.id,
          title: Book.title,
          coverImage: Book.cover_image,
          pageCount: Book.page_count,
          description: Book.description,
          normalizedTitle: Book.normalized_title,
          publicationYear: Book.publication_year,
        })
        .from(CollectionBook)
        .innerJoin(Book, eq(Book.id, CollectionBook.book_id))
        .where(eq(CollectionBook.collection_id, parseInt(collectionId)))
        .execute();

      for (let book of booksInCollection) {
        const authors = await db
          .select({ name: BookAuthor.name })
          .from(BookAuthor)
          .where(eq(BookAuthor.book_id, book.id))
          .execute();

        const genres = await db
          .select({ genre: BookGenre.genre })
          .from(BookGenre)
          .where(eq(BookGenre.book_id, book.id))
          .execute();

        book.authors = authors.map((author) => author.name);
        book.genres = genres.map((genre) => genre.genre);
      }
      res.json({
        title: collection[0].name,
        books: booksInCollection,
        isOwner,
        public: collection[0].public ? true : false,
      });
    } catch (error) {
      console.error("Error fetching books from collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/api/collection",
  authMiddleware,
  async (req: Request, res: Response) => {
    const body = req.body;
    const validation = createCollectionSchema.safeParse(body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request parameters",
        details: validation.error,
      });
    }

    const { name, user_id, public: publicStatus } = validation.data;

    if (req.auth?.userId !== user_id) {
      return res.status(403).json({ error: "Forbidden: User ID mismatch" });
    }

    try {
      const existingCollection = await db
        .select()
        .from(Collection)
        .where(and(eq(Collection.user_id, user_id), eq(Collection.name, name)))
        .execute();

      if (existingCollection.length > 0) {
        return res.status(409).json({
          error: "User already has a collection with this name",
        });
      }

      const newCollection = await db
        .insert(Collection)
        .values({ name, user_id, public: publicStatus })
        .returning()
        .execute();

      res.json(newCollection);
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.post(
  "/api/collection/:collectionId/book",
  authMiddleware,
  async (req, res) => {
    const bodyValidation = addBookToCollectionBodySchema.safeParse(req.body);
    const paramsValidation = CollectionParamsSchema.safeParse(req.params);

    if (!bodyValidation.success) {
      return res
        .status(400)
        .json({ error: "Invalid request body", details: bodyValidation.error });
    }

    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid URL parameter",
        details: paramsValidation.error,
      });
    }

    const { book_id } = bodyValidation.data;
    const collection_id = parseInt(paramsValidation.data.collectionId, 10);
    const userId = req.auth?.userId;

    if (isNaN(collection_id)) {
      return res
        .status(400)
        .json({ error: "Collection ID must be a valid number" });
    }

    try {
      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, collection_id))
        .execute();

      if (collection.length === 0) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (collection[0].user_id !== userId) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      const bookExists = await db
        .select()
        .from(Book)
        .where(eq(Book.id, book_id))
        .execute();

      if (bookExists.length === 0) {
        return res.status(404).json({ error: "Book not found" });
      }

      const existingEntry = await db
        .select()
        .from(CollectionBook)
        .where(
          and(
            eq(CollectionBook.collection_id, collection_id),
            eq(CollectionBook.book_id, book_id)
          )
        )
        .execute();
      if (existingEntry.length > 0) {
        return res
          .status(409)
          .json({ error: "This book is already in the collection" });
      }

      const addedBook = await db
        .insert(CollectionBook)
        .values({ collection_id, book_id })
        .returning()
        .execute();
      res.json({
        message: "Book added to collection successfully",
        addedBook: addedBook[0],
      });
    } catch (error) {
      console.error("Error adding book to collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/api/collection/:collectionId/book/:bookId",
  authMiddleware,
  async (req, res) => {
    const paramsValidation = deleteBookFromCollectionParamsSchema.safeParse(
      req.params
    );
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid URL parameters",
        details: paramsValidation.error.issues,
      });
    }

    const { collectionId, bookId } = paramsValidation.data;
    const collection_id = parseInt(collectionId, 10);
    const book_id = parseInt(bookId, 10);
    const userId = req.auth?.userId;
    if (isNaN(collection_id) || isNaN(book_id)) {
      return res
        .status(400)
        .json({ error: "Invalid collection_id or book_id" });
    }

    try {
      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, collection_id))
        .execute();

      if (!collection.length) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (collection[0].user_id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const book = await db
        .select()
        .from(Book)
        .where(eq(Book.id, book_id))
        .execute();

      if (!book.length) {
        return res.status(404).json({ error: "Book not found" });
      }

      const bookInCollection = await db
        .select()
        .from(CollectionBook)
        .where(
          and(
            eq(CollectionBook.collection_id, collection_id),
            eq(CollectionBook.book_id, book_id)
          )
        )
        .execute();

      if (!bookInCollection.length) {
        return res
          .status(404)
          .json({ error: "Book not found in the collection" });
      }

      await db
        .delete(CollectionBook)
        .where(
          and(
            eq(CollectionBook.collection_id, collection_id),
            eq(CollectionBook.book_id, book_id)
          )
        )
        .execute();

      res.json({});
    } catch (error) {
      console.error("Error removing book from collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.patch(
  "/api/collection/:collectionId",
  authMiddleware,
  async (req, res) => {
    const paramsValidation = CollectionParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid URL parameter",
        details: paramsValidation.error.issues,
      });
    }

    const bodyValidation = updateCollectionBodySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: bodyValidation.error.issues,
      });
    }

    const { collectionId } = paramsValidation.data;
    const { name: newName, public: newPublicStatus } = bodyValidation.data;
    if (
      !newName &&
      (newPublicStatus === undefined || newPublicStatus === null)
    ) {
      return res.status(400).json({ error: "Missing fields to update" });
    }

    const updateFields: { name?: string; public?: boolean } = {};
    if (newName) updateFields.name = newName;
    if (newPublicStatus !== undefined) updateFields.public = newPublicStatus;

    try {
      const parsedCollectionId = parseInt(collectionId, 10);
      if (isNaN(parsedCollectionId)) {
        return res.status(400).json({ error: "Invalid collectionId" });
      }

      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, parsedCollectionId))
        .execute();

      if (collection.length === 0) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (collection[0].user_id !== req.auth?.userId) {
        return res
          .status(403)
          .json({ error: "Forbidden: You do not own this collection" });
      }

      const updatedCollection = await db
        .update(Collection)
        .set(updateFields)
        .where(eq(Collection.id, parsedCollectionId))
        .returning()
        .execute();

      res.json(updatedCollection[0]);
    } catch (error) {
      console.error("Error updating collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/api/collection/:collectionId",
  authMiddleware,
  async (req, res) => {
    const paramsValidation = CollectionParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid URL parameter",
        details: paramsValidation.error.issues,
      });
    }

    const { collectionId } = paramsValidation.data;
    const parsedCollectionId = parseInt(collectionId, 10);

    try {
      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, parsedCollectionId))
        .execute();

      if (collection.length === 0) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (collection[0].user_id !== req.auth?.userId) {
        return res
          .status(403)
          .json({ error: "Forbidden: You do not own this collection" });
      }

      const deletedCollection = await db
        .delete(Collection)
        .where(eq(Collection.id, parsedCollectionId))
        .returning()
        .execute();

      res.json({});
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
