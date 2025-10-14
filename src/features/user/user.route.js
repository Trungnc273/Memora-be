import { Router } from "express";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";
import { detail, update } from "./user.controller.js";

const userRouter = Router();

userRouter.get("/:userId", detail);
userRouter.put("/:userId/update", update);

// middleware nên đặt trước route cần bảo vệ
userRouter.use(authMiddleware);

export default userRouter;
