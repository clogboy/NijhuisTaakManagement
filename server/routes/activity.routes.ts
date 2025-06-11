import { Router } from "express";
import { activityController } from "../controllers/activity.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, activityController.getActivities.bind(activityController));
router.get("/:id", requireAuth, activityController.getActivity.bind(activityController));
router.post("/", requireAuth, activityController.createActivity.bind(activityController));
router.put("/:id", requireAuth, activityController.updateActivity.bind(activityController));
router.delete("/:id", requireAuth, activityController.deleteActivity.bind(activityController));

export { router as activityRoutes };