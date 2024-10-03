import dotenv from "dotenv";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".prod.env" });
} else {
  dotenv.config({ path: ".dev.env" });
}

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client);
