import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, vaultTable } from "@workspace/db";
import { CreateVaultEntryBody, DeleteVaultEntryParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /vault
router.get("/vault", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(vaultTable)
    .orderBy(vaultTable.createdAt);
  res.json(entries);
});

// POST /vault
router.post("/vault", async (req, res): Promise<void> => {
  const parsed = CreateVaultEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [entry] = await db
    .insert(vaultTable)
    .values({ title: parsed.data.title, content: parsed.data.content })
    .returning();

  res.status(201).json(entry);
});

// DELETE /vault/:id
router.delete("/vault/:id", async (req, res): Promise<void> => {
  const params = DeleteVaultEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [entry] = await db
    .delete(vaultTable)
    .where(eq(vaultTable.id, params.data.id))
    .returning();

  if (!entry) {
    res.status(404).json({ error: "Vault entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
