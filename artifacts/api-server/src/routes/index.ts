import { Router, type IRouter } from "express";
import healthRouter from "./health";
import topicsRouter from "./adaptive-math/topics";
import studentsRouter from "./adaptive-math/students";
import diagnosticRouter from "./adaptive-math/diagnostic";
import practiceRouter from "./adaptive-math/practice";
import tutorRouter from "./adaptive-math/tutor";
import reviewRouter from "./adaptive-math/review";
import dashboardRouter from "./adaptive-math/dashboard";
import learningPathRouter from "./adaptive-math/learning-path";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(topicsRouter);
router.use(diagnosticRouter);
router.use(practiceRouter);
router.use(tutorRouter);
router.use(reviewRouter);
router.use(dashboardRouter);
router.use(learningPathRouter);

export default router;
