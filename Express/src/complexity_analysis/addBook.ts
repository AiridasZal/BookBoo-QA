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
