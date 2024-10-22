import express from "express";
import bookController from "../controllers/bookController";

const router = express.Router();

router.get("/api/book", bookController.getRandomBooks());
router.get("/api/book/search", bookController.searchBooks());
router.get("/api/book/:id", bookController.getBookById());

export default router;
