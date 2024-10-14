router.delete(
  "/api/collection/:collectionId",
  authMiddleware,
  async (req, res) => {
    const paramsValidation = CollectionParamsSchema.safeParse(req.params);
    if (!paramsValidation.success) {
      return res.status(400).json({
        error: "Invalid URL parameter",
        details: paramsValidation.error.issues,
      });
    }

    const { collectionId } = paramsValidation.data;
    const parsedCollectionId = parseInt(collectionId, 10);

    try {
      const collection = await db
        .select()
        .from(Collection)
        .where(eq(Collection.id, parsedCollectionId))
        .execute();

      if (collection.length === 0) {
        return res.status(404).json({ error: "Collection not found" });
      }

      if (collection[0].user_id !== req.auth?.userId) {
        return res
          .status(403)
          .json({ error: "Forbidden: You do not own this collection" });
      }

      const deletedCollection = await db
        .delete(Collection)
        .where(eq(Collection.id, parsedCollectionId))
        .returning()
        .execute();

      res.json({});
    } catch (error) {
      console.error("Error deleting collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
