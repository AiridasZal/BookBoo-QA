import { db } from "../db/db";
import { Book, BookAuthor, BookGenre } from "../db/schema";
import { eq, sql, count } from "drizzle-orm";

export async function getRandomBooks(limit: number) {
  return db
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
    .orderBy(sql`RANDOM()`)
    .limit(limit)
    .execute();
}

export async function getBookAuthors(bookId: number) {
  return db
    .select({ name: BookAuthor.name })
    .from(BookAuthor)
    .where(eq(BookAuthor.book_id, bookId))
    .execute();
}

export async function getBookGenres(bookId: number) {
  return db
    .select({ genre: BookGenre.genre })
    .from(BookGenre)
    .where(eq(BookGenre.book_id, bookId))
    .execute();
}

export async function searchBooks(
  query: string,
  limit: number,
  offset: number
) {
  return db
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
    .where(sql`title ILIKE ${`%${query}%`}`)
    .limit(limit)
    .offset(offset)
    .execute();
}

export async function getTotalBooksCount(query: string) {
  const result = await db
    .select({ count: count() })
    .from(Book)
    .where(sql`title ILIKE ${`%${query}%`}`)
    .execute();

  return Number(result[0]?.count) || 0;
}

export async function getBookById(bookId: number) {
  const books = await db
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
    .where(eq(Book.id, bookId))
    .execute();

  return books[0];
}
