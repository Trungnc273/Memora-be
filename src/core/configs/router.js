import { Router } from "express";
import authRouter from "../../features/auth/auth.route.js";
import userRouter from "../../features/user/user.route.js";
import roleRouter from "../../features/role/role.route.js";
import permissionRouter from "../../features/permission/permission.route.js";
import followRouter from "../../features/follow/follow.route.js";
import postRouter from "../../features/post/post.route.js";
import conversationRouter from "../../features/conversation/conversation.route.js";
import messageRouter from "../../features/message/message.route.js";
const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/role", roleRouter);
router.use("/permission", permissionRouter);
router.use("/follow", followRouter);
router.use("/post", postRouter);
router.use("/conversation", conversationRouter);
router.use("/message", messageRouter);

export default router;
