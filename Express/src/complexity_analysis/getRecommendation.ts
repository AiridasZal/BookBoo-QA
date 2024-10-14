router.get("/api/recommend", async function (req: Request, res: Response) {
  const { book_id, method, limit } = req.query;
  const bookIdNum = parseInt(book_id as string);
  const limitNum = parseInt(limit as string);
  const validation = bookRecommendationRequestSchema.safeParse({
    book_id: bookIdNum,
    method,
    limit: limitNum,
  });

  if (!validation.success) {
    return res
      .status(400)
      .json({ error: "Invalid request parameters", details: validation.error });
  }
  const {
    book_id: validBookId,
    method: validMethod,
    limit: validLimit,
  } = validation.data;

  try {
    const query = `book_id=${validBookId}&method=${validMethod}&limit=${validLimit}`;
    const recommendations = await fetch(
      `${process.env.RECOMMENDATION_SERVICE_URL}/recommend?${query}`
    );
    const recommendedIds = await recommendations.json();

    const recommendedBooks = await db
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
      .where(inArray(Book.id, recommendedIds))
      .execute();

    const authors = await db
      .select({
        bookId: BookAuthor.book_id,
        name: BookAuthor.name,
      })
      .from(BookAuthor)
      .where(inArray(BookAuthor.book_id, recommendedIds))
      .execute();

    const genres = await db
      .select({
        bookId: BookGenre.book_id,
        genre: BookGenre.genre,
      })
      .from(BookGenre)
      .where(inArray(BookGenre.book_id, recommendedIds))
      .execute();

    const booksWithDetails = recommendedBooks.map((book) => ({
      ...book,
      authors: authors
        .filter((author) => author.bookId === book.id)
        .map((author) => author.name),
      genres: genres
        .filter((genre) => genre.bookId === book.id)
        .map((genre) => genre.genre),
    }));
    return res.json(booksWithDetails);
  } catch (error) {
    console.error("Error fetching book recommendations:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
