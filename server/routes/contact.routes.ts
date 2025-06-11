import { Router } from "express";
import { contactController } from "../controllers/contact.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/", requireAuth, contactController.getContacts.bind(contactController));
router.get("/search", requireAuth, contactController.searchContacts.bind(contactController));
router.get("/:id", requireAuth, contactController.getContact.bind(contactController));
router.post("/", requireAuth, contactController.createContact.bind(contactController));
router.put("/:id", requireAuth, contactController.updateContact.bind(contactController));
router.delete("/:id", requireAuth, contactController.deleteContact.bind(contactController));

export { router as contactRoutes };