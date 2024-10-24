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
  const Books = await getRandomBooks(limit);

  return Promise.all(
    Books.map(async (book) => {
      const [Authors, Genres] = await Promise.all([
        getBookAuthors(book.id),
        getBookGenres(book.id),
      ]);

      return {
        ...book,
        authors: Authors.map((a) => a.name),
        genres: Genres.map((g) => g.genre),
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

  const data = await Promise.all(
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

  const TotalBooksCount = await getTotalBooksCount(query);
  const TotalPages = Math.ceil(TotalBooksCount / limit);

  const Next =
    page < TotalPages
      ? `${EXPRESS_URL}:${PORT}/api/book/search?query=${query}&page=${
          page + 1
        }&limit=${limit}`
      : null;

  const Prev =
    page > 1
      ? `${EXPRESS_URL}:${PORT}/api/book/search?query=${query}&page=${
          page - 1
        }&limit=${limit}`
      : null;

  return {
    count: TotalBooksCount,
    next: Next,
    prev: Prev,
    results: data,
  };
}

export async function fetchBookById(bookId: number) {
  const data = await getBookById(bookId);
  if (!data) return null;

  const [authors, genres] = await Promise.all([
    getBookAuthors(bookId),
    getBookGenres(bookId),
  ]);

  return {
    ...data,
    authors: authors.map((a) => a.name),
    genres: genres.map((g) => g.genre),
  };
}
