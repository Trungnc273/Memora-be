import { Router } from "express";
import { getUserMedia, getMediaById } from "./media.controller.js";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/user/:userId", getUserMedia);
router.get("/:id", getMediaById);

export default router;
