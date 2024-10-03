import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import CollectionRouter from "./collection";
import { PORT } from "./config";
import RecommendationRouter from "./recommendation";
import BookRouter from "./routes/bookRoutes";
import WebhookRouter from "./webhook";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      sessionClaims: {
        [key: string]: any;
      };
      sessionId: string;
      userId: string;
      claims: {
        [key: string]: any;
      };
    };
  }
}

const app = express();
app.use(cors());

app.use((req, res, next) => {
  if (req.path !== "/api/webhooks") {
    return express.json()(req, res, next);
  }
  next();
});

app.use(WebhookRouter);
app.use(BookRouter);
app.use(RecommendationRouter);
app.use(CollectionRouter);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error occurred:", err.message || err);
  if (err.message === "Unauthenticated") {
    return res.status(401).json({ error: "Unauthorized request!" });
  }
  res.status(500).json({ error: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`BookBoo Express listening on port ${PORT}`);
});
