import { integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const insightTypeEnum = pgEnum("insight_type", ["expense", "investment", "report", "health", "prediction"]);

export const aiInsightsTable = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: insightTypeEnum("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  score: integer("score"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInsightSchema = createInsertSchema(aiInsightsTable).omit({ id: true, createdAt: true });
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type AiInsight = typeof aiInsightsTable.$inferSelect;
