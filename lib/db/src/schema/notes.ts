import { pgTable, text, serial, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const notesTable = pgTable("notes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  done: boolean("done").notNull().default(false),
  projectId: integer("project_id").references(() => projectsTable.id, { onDelete: "set null" }),
  priority: text("priority"),  // 'high' | 'medium' | 'low' | null
  dayOfWeek: integer("day_of_week"),  // 0=Mon … 6=Sun | null
  deadline: timestamp("deadline", { withTimezone: true }),  // optional deadline datetime
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNoteSchema = createInsertSchema(notesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;
