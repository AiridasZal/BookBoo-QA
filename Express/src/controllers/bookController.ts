import { Request, Response } from "express";
import * as bookService from "../services/bookService";

const bookController = {
  getRandomBooks:
    (service = bookService) =>
    async (req: Request, res: Response) => {
      try {
        const books = await service.fetchRandomBooks(5);
        res.json(books);
      } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },

  searchBooks:
    (service = bookService) =>
    async (req: Request, res: Response) => {
      try {
        const query = req.query.query as string;
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        if (!query) {
          return res
            .status(400)
            .json({ error: "Query parameter 'query' is required" });
        }

        const result = await service.fetchSearchedBooks(query, page, limit);

        if (result.results.length === 0) {
          return res
            .status(404)
            .json({ error: "No books found matching the query." });
        }

        res.json(result);
      } catch (error) {
        console.error("Error searching books:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },

  getBookById:
    (service = bookService) =>
    async (req: Request, res: Response) => {
      try {
        const bookId = parseInt(req.params.id);
        if (isNaN(bookId)) {
          return res.status(400).json({ error: "Invalid book ID" });
        }

        const book = await service.fetchBookById(bookId);
        if (!book) {
          return res.status(404).json({ error: "Book not found" });
        }

        res.json(book);
      } catch (error) {
        console.error("Error fetching book details:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    },
};

export default bookController;
