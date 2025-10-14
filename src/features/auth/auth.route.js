import { Router } from "express";
// Lấy class Router từ express để tạo ra một "mini app" dùng cho auth routes.

import { signIn, signUp } from "./auth.controller.js";
// Import 2 controller đã viết để xử lý logic đăng ký & đăng nhập.

const authRouter = Router();
// Khởi tạo router riêng cho auth.

authRouter.post("/sign-up", signUp);
// POST /auth/sign-up  → gọi hàm signUp

authRouter.post("/sign-in", signIn);
// POST /auth/sign-in → gọi hàm signIn

export default authRouter;
// Xuất router để gắn vào app chính.
