import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import usersRouter from "./users.js";
import projectsRouter from "./projects.js";
import connectionsRouter from "./connections.js";
import notificationsRouter from "./notifications.js";
import adminRouter from "./admin.js";
import metaRouter from "./meta.js";
import applicationsRouter from "./applications.js";
import debugRouter from "./debug.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(connectionsRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(metaRouter);
router.use(applicationsRouter);
router.use(debugRouter);

export default router;
