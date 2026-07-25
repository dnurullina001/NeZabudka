import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import initSqlJs, { type Database } from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────────

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
  priority: text("priority"),           // 'high' | 'medium' | 'low' | null
  dayOfWeek: integer("day_of_week"),    // 0=Пн … 6=Вс | null
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

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

// ── Persistence helpers ────────────────────────────────────────────────────────

function saveDb(sqlite: Database, dbPath: string) {
  const data = sqlite.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// ── Server factory ─────────────────────────────────────────────────────────────

export async function createServer(dbPath: string, rendererPath: string, wasmPath: string) {
  const SQL = await initSqlJs({ locateFile: () => wasmPath });

  let sqlite: Database;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlite = new SQL.Database(fileBuffer);
  } else {
    sqlite = new SQL.Database();
  }

  // Ensure tables exist (migrations via ADD COLUMN IF NOT EXISTS)
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
  `);

  // Non-destructive migrations for existing databases
  try { sqlite.run(`ALTER TABLE notes ADD COLUMN priority TEXT`); } catch {}
  try { sqlite.run(`ALTER TABLE notes ADD COLUMN day_of_week INTEGER`); } catch {}

  saveDb(sqlite, dbPath);

  const db = drizzle(sqlite, { schema: { projectsTable, notesTable } });
  const save = () => saveDb(sqlite, dbPath);

  const app = express();
  app.use(cors());
  app.use(express.json());

  // ── Health ───────────────────────────────────────────────────────────────────

  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

  // ── Projects ─────────────────────────────────────────────────────────────────

  app.get("/api/projects", async (_req, res) => {
    const rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
    res.json(rows);
  });

  app.post("/api/projects", async (req, res) => {
    const parsed = CreateProjectBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
    const [row] = await db.insert(projectsTable).values(parsed.data).returning();
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

  // ── Notes stats ───────────────────────────────────────────────────────────────

  app.get("/api/notes/stats", async (_req, res) => {
    const [row] = await db.select({
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when done = 0 then 1 else 0 end)`,
      done: sql<number>`sum(case when done = 1 then 1 else 0 end)`,
    }).from(notesTable);
    res.json({ total: row?.total ?? 0, active: row?.active ?? 0, done: row?.done ?? 0 });
  });

  // ── Notes ─────────────────────────────────────────────────────────────────────

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
    if (parsed.data.content !== undefined) update.content = parsed.data.content;
    if ("projectId" in parsed.data) update.project_id = parsed.data.projectId ?? null;
    if ("priority" in parsed.data) update.priority = parsed.data.priority ?? null;
    if ("dayOfWeek" in parsed.data) update.day_of_week = parsed.data.dayOfWeek ?? null;
    if (Object.keys(update).length > 0) update.updated_at = new Date().toISOString();
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

  // ── Vault (no-op stub so frontend doesn't error) ──────────────────────────────

  app.get("/api/vault", (_req, res) => res.json([]));
  app.post("/api/vault", (_req, res) => res.status(201).json({ id: 0, title: "", content: "", createdAt: "", updatedAt: "" }));
  app.delete("/api/vault/:id", (_req, res) => res.sendStatus(204));

  // ── Static renderer ──────────────────────────────────────────────────────────

  app.use(express.static(rendererPath));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(rendererPath, "index.html"));
  });

  return app;
}
