import { Router } from "express";
import { sendMessage, getMessages } from "./message.controller.js";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";

const router = Router();

// Áp dụng auth cho tất cả route
router.use(authMiddleware);

router.post("/:conversationId", sendMessage);
router.get("/:conversationId", getMessages);

export default router;
