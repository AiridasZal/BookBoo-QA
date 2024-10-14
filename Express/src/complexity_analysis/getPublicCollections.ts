router.get("/api/collection", async (req, res) => {
  try {
    const publicCollections = await db
      .select({
        id: Collection.id,
        name: Collection.name,
        creatorName: User.username,
      })
      .from(Collection)
      .innerJoin(User, eq(User.id, Collection.user_id))
      .where(eq(Collection.public, true))
      .execute();

    if (!publicCollections.length) {
      return res.status(404).json({ message: "No public collections found" });
    }

    res.json(publicCollections);
  } catch (error) {
    console.error("Error fetching public collections:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
