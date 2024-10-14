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
