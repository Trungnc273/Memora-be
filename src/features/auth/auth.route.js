import { Router } from "express";
// Lấy class Router từ express để tạo ra một "mini app" dùng cho auth routes.

import { signIn, signUp, signOut } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/sign-up", signUp);

authRouter.post("/sign-in", signIn);

authRouter.post("/sign-out", signOut);
export default authRouter;
