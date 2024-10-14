import { eq } from "drizzle-orm";
import { router } from "../book";
import { db } from "../db/db";
import { Book, BookAuthor, BookGenre } from "../db/schema";

router.get("/api/book/:id", async function (req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid book ID" });
    }

    const bookArray = await db
      .select({
        id: Book.id,
        title: Book.title,
        averageRating: Book.average_rating,
        ratingsCount: Book.ratings_count,
        coverImage: Book.cover_image,
        pageCount: Book.page_count,
        description: Book.description,
        normalizedTitle: Book.normalized_title,
        publicationYear: Book.publication_year,
      })
      .from(Book)
      .where(eq(Book.id, id))
      .execute();

    const book = bookArray[0];
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const [authors, genres] = await Promise.all([
      db
        .select({ name: BookAuthor.name })
        .from(BookAuthor)
        .where(eq(BookAuthor.book_id, id))
        .execute(),
      db
        .select({ genre: BookGenre.genre })
        .from(BookGenre)
        .where(eq(BookGenre.book_id, id))
        .execute(),
    ]);

    const bookDetails = {
      ...book,
      authors: authors.map((a) => a.name),
      genres: genres.map((g) => g.genre),
    };

    return res.json(bookDetails);
  } catch (error) {
    console.error("Error fetching book details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
