router.patch(
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

    const bodyValidation = updateCollectionBodySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        error: "Invalid request body",
        details: bodyValidation.error.issues,
      });
    }

    const { collectionId } = paramsValidation.data;
    const { name: newName, public: newPublicStatus } = bodyValidation.data;
    if (
      !newName &&
      (newPublicStatus === undefined || newPublicStatus === null)
    ) {
      return res.status(400).json({ error: "Missing fields to update" });
    }

    const updateFields: { name?: string; public?: boolean } = {};
    if (newName) updateFields.name = newName;
    if (newPublicStatus !== undefined) updateFields.public = newPublicStatus;

    try {
      const parsedCollectionId = parseInt(collectionId, 10);
      if (isNaN(parsedCollectionId)) {
        return res.status(400).json({ error: "Invalid collectionId" });
      }

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

      const updatedCollection = await db
        .update(Collection)
        .set(updateFields)
        .where(eq(Collection.id, parsedCollectionId))
        .returning()
        .execute();

      res.json(updatedCollection[0]);
    } catch (error) {
      console.error("Error updating collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
