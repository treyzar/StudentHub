import { Router, type IRouter } from "express";
import healthRouter from "./health";
import subjectsRouter from "./subjects";
import lessonsRouter from "./lessons";
import tasksRouter from "./tasks";
import debtsRouter from "./debts";
import gradesRouter from "./grades";
import testsRouter from "./tests";
import notesRouter from "./notes";
import weeklyPlansRouter from "./weeklyPlans";
import dashboardRouter from "./dashboard";
import googleRouter from "./google";

const router: IRouter = Router();

router.use(healthRouter);
router.use(subjectsRouter);
router.use(lessonsRouter);
router.use(tasksRouter);
router.use(debtsRouter);
router.use(gradesRouter);
router.use(testsRouter);
router.use(notesRouter);
router.use(weeklyPlansRouter);
router.use(dashboardRouter);
router.use(googleRouter);

export default router;
