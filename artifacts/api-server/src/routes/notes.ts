import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, notesTable } from "@workspace/db";
import {
  CreateNoteBody,
  UpdateNoteBody,
  UpdateNoteParams,
  DeleteNoteParams,
  ToggleNoteParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /notes
router.get("/notes", async (_req, res): Promise<void> => {
  const notes = await db
    .select()
    .from(notesTable)
    .orderBy(notesTable.createdAt);
  res.json(notes);
});

// GET /notes/stats
router.get("/notes/stats", async (_req, res): Promise<void> => {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where done = false)::int`,
      done: sql<number>`count(*) filter (where done = true)::int`,
    })
    .from(notesTable);
  res.json(row ?? { total: 0, active: 0, done: 0 });
});

// POST /notes
router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [note] = await db
    .insert(notesTable)
    .values({
      content: parsed.data.content,
      projectId: parsed.data.projectId ?? null,
      priority: parsed.data.priority ?? null,
      dayOfWeek: parsed.data.dayOfWeek ?? null,
    })
    .returning();

  res.status(201).json(note);
});

// PATCH /notes/:id
router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;
  if ("projectId" in parsed.data) updateData.projectId = parsed.data.projectId ?? null;
  if ("priority" in parsed.data) updateData.priority = parsed.data.priority ?? null;
  if ("dayOfWeek" in parsed.data) updateData.dayOfWeek = parsed.data.dayOfWeek ?? null;

  const [note] = await db
    .update(notesTable)
    .set(updateData)
    .where(eq(notesTable.id, params.data.id))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.json(note);
});

// DELETE /notes/:id
router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [note] = await db
    .delete(notesTable)
    .where(eq(notesTable.id, params.data.id))
    .returning();

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  res.sendStatus(204);
});

// PATCH /notes/:id/toggle
router.patch("/notes/:id/toggle", async (req, res): Promise<void> => {
  const params = ToggleNoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const [note] = await db
    .update(notesTable)
    .set({ done: !existing.done })
    .where(eq(notesTable.id, params.data.id))
    .returning();

  res.json(note);
});

export default router;
