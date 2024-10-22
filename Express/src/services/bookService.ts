import {
  getRandomBooks,
  getBookAuthors,
  getBookGenres,
  searchBooks,
  getTotalBooksCount,
  getBookById,
} from "../data-access/bookDataAccess";
import { EXPRESS_URL, PORT } from "../config";

export async function fetchRandomBooks(limit: number) {
  const books = await getRandomBooks(limit);

  return Promise.all(
    books.map(async (book) => {
      const [authors, genres] = await Promise.all([
        getBookAuthors(book.id),
        getBookGenres(book.id),
      ]);

      return {
        ...book,
        authors: authors.map((a) => a.name),
        genres: genres.map((g) => g.genre),
      };
    })
  );
}

export async function fetchSearchedBooks(
  query: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  const books = await searchBooks(query, limit, offset);

  const booksDetails = await Promise.all(
    books.map(async (book) => {
      const [authors, genres] = await Promise.all([
        getBookAuthors(book.id),
        getBookGenres(book.id),
      ]);

      return {
        ...book,
        authors: authors.map((a) => a.name),
        genres: genres.map((g) => g.genre),
      };
    })
  );

  const totalBooksCount = await getTotalBooksCount(query);
  const totalPages = Math.ceil(totalBooksCount / limit);

  const next =
    page < totalPages
      ? `${EXPRESS_URL}:${PORT}/api/book/search?query=${query}&page=${
          page + 1
        }&limit=${limit}`
      : null;

  const prev =
    page > 1
      ? `${EXPRESS_URL}:${PORT}/api/book/search?query=${query}&page=${
          page - 1
        }&limit=${limit}`
      : null;

  return {
    count: totalBooksCount,
    next,
    prev,
    results: booksDetails,
  };
}

export async function fetchBookById(bookId: number) {
  const book = await getBookById(bookId);
  if (!book) return null;

  const [authors, genres] = await Promise.all([
    getBookAuthors(bookId),
    getBookGenres(bookId),
  ]);

  return {
    ...book,
    authors: authors.map((a) => a.name),
    genres: genres.map((g) => g.genre),
  };
}
