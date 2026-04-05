import { defineConfig } from "drizzle-kit";
import path from "path";
import * as dotenv from "dotenv";

// This line tells Drizzle to look at your .env file for the DATABASE_URL
dotenv.config({ path: path.join(__dirname, ".env") });

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL not found in .env, falling back to local default.");
}

export default defineConfig({
  // Points to your actual schema file
  schema: "./src/schema/index.ts", 
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/xenfi",
  },
});