import { Router } from "express";
import multer from "multer";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";
import {
  detail,
  updateDisplayName,
  uploadImage,
  deleteAccount,
} from "./user.controller.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get("/", detail);
router.put("/displayName", updateDisplayName);
router.put("/image", upload.single("image"), uploadImage);
router.delete("/", deleteAccount);
export default router;
