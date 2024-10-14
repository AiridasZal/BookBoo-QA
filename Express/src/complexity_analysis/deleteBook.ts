router.delete(
  "/api/collection/:collectionId/book/:bookId",
  authMiddleware,
  async (req, res) => {
    const paramsValidation = deleteBookFromCollectionParamsSchema.safeParse(
      req.params
    );
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid URL parameters",
        details: paramsValidation.error.issues,
      });
    }

    const { collectionId, bookId } = paramsValidation.data;
    const collection_id = parseInt(collectionId, 10);
    const book_id = parseInt(bookId, 10);
    const userId = req.auth?.userId;
    if (isNaN(collection_id) || isNaN(book_id)) {
      return res
        .status(400)
        .json({ error: "Invalid collection_id or book_id" });
    }

    try {
      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, collection_id))
        .execute();

      if (!collection.length) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (collection[0].user_id !== userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const book = await db
        .select()
        .from(Book)
        .where(eq(Book.id, book_id))
        .execute();

      if (!book.length) {
        return res.status(404).json({ error: "Book not found" });
      }

      const bookInCollection = await db
        .select()
        .from(CollectionBook)
        .where(
          and(
            eq(CollectionBook.collection_id, collection_id),
            eq(CollectionBook.book_id, book_id)
          )
        )
        .execute();

      if (!bookInCollection.length) {
        return res
          .status(404)
          .json({ error: "Book not found in the collection" });
      }

      await db
        .delete(CollectionBook)
        .where(
          and(
            eq(CollectionBook.collection_id, collection_id),
            eq(CollectionBook.book_id, book_id)
          )
        )
        .execute();

      res.json({});
    } catch (error) {
      console.error("Error removing book from collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
