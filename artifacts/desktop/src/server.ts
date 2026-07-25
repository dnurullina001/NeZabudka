import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import initSqlJs, { type Database } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const projectsTable = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

const notesTable = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  content: text("content").notNull(),
  done: integer("done", { mode: "boolean" }).notNull().default(false),
  projectId: integer("project_id").references(() => projectsTable.id),
  priority: text("priority"),
  dayOfWeek: integer("day_of_week"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

const vaultTable = sqliteTable("vault", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

const CreateProjectBody = z.object({ name: z.string().min(1), color: z.string().min(1) });
const UpdateProjectBody = z.object({ name: z.string().min(1).optional(), color: z.string().min(1).optional() });
const IdParam = z.object({ id: z.coerce.number().int().positive() });

const CreateNoteBody = z.object({
  content: z.string().min(1),
  projectId: z.number().int().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
});

const UpdateNoteBody = z.object({
  content: z.string().min(1).optional(),
  projectId: z.number().int().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).nullable().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
});

const CreateVaultBody = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

function saveDb(sqlite: Database, dbPath: string) {
  const data = sqlite.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

export async function createServer(dbPath: string, rendererPath: string, wasmPath: string) {
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  let sqlite: Database;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlite = new SQL.Database(fileBuffer);
  } else {
    sqlite = new SQL.Database();
  }

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      priority TEXT,
      day_of_week INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS vault (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  try { sqlite.run(`ALTER TABLE notes ADD COLUMN priority TEXT`); } catch {}
  try { sqlite.run(`ALTER TABLE notes ADD COLUMN day_of_week INTEGER`); } catch {}

  saveDb(sqlite, dbPath);

  const db = drizzle(sqlite, { schema: { projectsTable, notesTable, vaultTable } });
  const save = () => saveDb(sqlite, dbPath);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

  app.get("/api/projects", async (_req, res) => {
    const rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    res.json(rows);
  });

  app.post("/api/projects", async (req, res) => {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.insert(projectsTable).values({ name: parsed.data.name, color: parsed.data.color }).returning();
    save();
    res.status(201).json(row);
  });

  app.patch("/api/projects/:id", async (req, res) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = UpdateProjectBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.update(projectsTable).set(parsed.data).where(eq(projectsTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Project not found" }); return; }
    save();
    res.json(row);
  });

  app.delete("/api/projects/:id", async (req, res) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Project not found" }); return; }
    save();
    res.sendStatus(204);
  });

  app.get("/api/notes/stats", async (_req, res) => {
    const rows = await db.select().from(notesTable);
    const total = rows.length;
    const done = rows.filter(r => r.done).length;
    res.json({ total, done, active: total - done });
  });

  app.get("/api/notes", async (_req, res) => {
    const rows = await db.select().from(notesTable).orderBy(notesTable.createdAt);
    res.json(rows);
  });

  app.post("/api/notes", async (req, res) => {
    const parsed = CreateNoteBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.insert(notesTable).values({
      content: parsed.data.content,
      projectId: parsed.data.projectId ?? null,
      priority: parsed.data.priority ?? null,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
    }).returning();
    save();
    res.status(201).json(row);
  });

  app.patch("/api/notes/:id", async (req, res) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const parsed = UpdateNoteBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const update: Record<string, unknown> = {};
    if (parsed.data.content !== undefined)  update.content   = parsed.data.content;
    if ("projectId" in parsed.data)         update.projectId = parsed.data.projectId ?? null;
    if ("priority"  in parsed.data)         update.priority  = parsed.data.priority  ?? null;
    if ("dayOfWeek" in parsed.data)         update.dayOfWeek = parsed.data.dayOfWeek ?? null;
    if (Object.keys(update).length > 0)     update.updatedAt = new Date().toISOString();

    const [row] = await db.update(notesTable).set(update).where(eq(notesTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Note not found" }); return; }
    save();
    res.json(row);
  });

  app.delete("/api/notes/:id", async (req, res) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.delete(notesTable).where(eq(notesTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Note not found" }); return; }
    save();
    res.sendStatus(204);
  });

  app.patch("/api/notes/:id/toggle", async (req, res) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const [existing] = await db.select().from(notesTable).where(eq(notesTable.id, params.data.id));
    if (!existing) { res.status(404).json({ error: "Note not found" }); return; }
    const [row] = await db.update(notesTable)
      .set({ done: !existing.done, updatedAt: new Date().toISOString() })
      .where(eq(notesTable.id, params.data.id))
      .returning();
    save();
    res.json(row);
  });

  app.get("/api/vault", async (_req, res) => {
    const rows = await db.select().from(vaultTable).orderBy(vaultTable.createdAt);
    res.json(rows);
  });

  app.post("/api/vault", async (req, res) => {
    const parsed = CreateVaultBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.insert(vaultTable).values({
      title: parsed.data.title,
      content: parsed.data.content,
    }).returning();
    save();
    res.status(201).json(row);
  });

  app.delete("/api/vault/:id", async (req, res) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.delete(vaultTable).where(eq(vaultTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Vault entry not found" }); return; }
    save();
    res.sendStatus(204);
  });

  app.use(express.static(rendererPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(rendererPath, "index.html"));
  });

  return app;
}
