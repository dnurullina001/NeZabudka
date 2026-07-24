import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const vaultTable = pgTable("vault", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVaultSchema = createInsertSchema(vaultTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertVault = z.infer<typeof insertVaultSchema>;
export type VaultEntry = typeof vaultTable.$inferSelect;
