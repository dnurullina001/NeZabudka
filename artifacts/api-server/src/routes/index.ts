import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notesRouter from "./notes";
import projectsRouter from "./projects";
import vaultRouter from "./vault";

const router: IRouter = Router();

router.use(healthRouter);
router.use(notesRouter);
router.use(projectsRouter);
router.use(vaultRouter);

export default router;
