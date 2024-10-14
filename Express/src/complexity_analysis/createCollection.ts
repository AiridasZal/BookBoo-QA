router.post(
  "/api/collection",
  authMiddleware,
  async (req: Request, res: Response) => {
    const body = req.body;
    const validation = createCollectionSchema.safeParse(body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request parameters",
        details: validation.error,
      });
    }

    const { name, user_id, public: publicStatus } = validation.data;

    if (req.auth?.userId !== user_id) {
      return res.status(403).json({ error: "Forbidden: User ID mismatch" });
    }

    try {
      const existingCollection = await db
        .select()
        .from(Collection)
        .where(and(eq(Collection.user_id, user_id), eq(Collection.name, name)))
        .execute();

      if (existingCollection.length > 0) {
        return res.status(409).json({
          error: "User already has a collection with this name",
        });
      }

      const newCollection = await db
        .insert(Collection)
        .values({ name, user_id, public: publicStatus })
        .returning()
        .execute();

      res.json(newCollection);
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
