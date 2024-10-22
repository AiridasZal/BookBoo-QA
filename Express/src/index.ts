import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import BookRouter from "./routes/bookRoutes";
import CollectionRouter from "./collection";
import RecommendationRouter from "./recommendation";
import WebhookRouter from "./webhook";
import { authMiddleware } from "./middlewares/authMiddleware";

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

if (process.env.NODE_ENV === "production") {
  console.log("Running in production mode.");
  dotenv.config({ path: ".prod.env" });
} else {
  console.log("Running in development mode.");
  dotenv.config({ path: ".dev.env" });
}

const { PORT } = process.env;

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

app.get(
  "/api/protected-endpoint",
  authMiddleware,
  (req: Request, res: Response) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Unauthorized request!" });
    }
    res.json(req.auth);
  }
);

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
