router.get(
  "/api/users/:userId/collections",
  authMiddleware,
  async (req, res) => {
    const { userId } = req.params;

    if (req.auth?.userId !== userId) {
      return res.status(403).json({ error: "Forbidden: User ID mismatch" });
    }

    try {
      const userCollections = await db
        .select({
          id: Collection.id,
          name: Collection.name,
          public: Collection.public,
        })
        .from(Collection)
        .where(eq(Collection.user_id, userId))
        .execute();

      if (!userCollections.length) {
        return res.status(404).json({ message: "No collections found" });
      }

      res.json(userCollections);
    } catch (error) {
      console.error("Error fetching user collections:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
