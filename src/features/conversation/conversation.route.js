import { Router } from "express";
import {
  //   createConversation,
  getUserConversations,
  deleteConversation,
} from "./conversation.controller.js";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";

const router = Router();

// Áp dụng auth cho tất cả route
router.use(authMiddleware);

// Follow / Unfollow / Block
// router.post("/", createConversation);
router.get("/", getUserConversations);
router.delete("/:conversationId", deleteConversation);

export default router;
