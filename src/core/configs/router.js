import { Router } from "express";
import authRouter from "../../features/auth/auth.route.js";
import userRouter from "../../features/user/user.route.js";
import roleRouter from "../../features/role/role.route.js";
import permissionRouter from "../../features/permission/permission.route.js";
import followRouter from "../../features/follow/follow.route.js";
import postRouter from "../../features/post/post.route.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/user", userRouter);
router.use("/role", roleRouter);
router.use("/permission", permissionRouter);
router.use("/follow", followRouter);
router.use("/post", postRouter);

export default router;
