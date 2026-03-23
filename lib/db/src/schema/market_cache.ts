import { doublePrecision, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const marketTypeEnum = pgEnum("market_type", ["stock", "crypto", "gold", "currency", "commodity"]);

export const marketCacheTable = pgTable("market_data_cache", {
  id: serial("id").primaryKey(),
  type: marketTypeEnum("type").notNull(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  price: doublePrecision("price").notNull(),
  changePercent: doublePrecision("change_percent").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertMarketCacheSchema = createInsertSchema(marketCacheTable).omit({ id: true });
export type InsertMarketCache = z.infer<typeof insertMarketCacheSchema>;
export type MarketCache = typeof marketCacheTable.$inferSelect;
