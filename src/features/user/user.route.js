import { Router } from "express";
import multer from "multer";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";
import {
  detail,
  updateDisplayName,
  uploadImage,
  deleteAccount,
  searchUser,
  changePassword,
} from "./user.controller.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get("/", detail);
router.get("/search", searchUser);
router.put("/displayName", updateDisplayName);
router.put("/password", changePassword);
router.put("/image", upload.single("image"), uploadImage);
router.delete("/", deleteAccount);
export default router;
