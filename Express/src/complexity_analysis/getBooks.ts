import { sql, eq } from "drizzle-orm";
import { router } from "src/book";
import { db } from "src/db/db";
import { Book, BookAuthor, BookGenre } from "src/db/schema";

router.get("/api/book", async function (req: Request, res: Response) {
  try {
    const books = await db
      .select({
        id: Book.id,
        title: Book.title,
        description: Book.description,
        coverImage: Book.cover_image,
        averageRating: Book.average_rating,
        ratingsCount: Book.ratings_count,
        pageCount: Book.page_count,
        publicationYear: Book.publication_year,
      })
      .from(Book)
      .orderBy(sql.raw("RANDOM()"))
      .limit(5)
      .execute();

    const booksDetails = await Promise.all(
      books.map(async (book) => {
        const authors = await db
          .select({
            name: BookAuthor.name,
          })
          .from(BookAuthor)
          .where(eq(BookAuthor.book_id, book.id))
          .execute();

        const genres = await db
          .select({
            genre: BookGenre.genre,
          })
          .from(BookGenre)
          .where(eq(BookGenre.book_id, book.id))
          .execute();

        return {
          ...book,
          genres: genres.map((g) => g.genre),
          authors: authors.map((a) => a.name),
        };
      })
    );

    return res.json(booksDetails);
  } catch (error) {
    console.error("Error fetching books:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
