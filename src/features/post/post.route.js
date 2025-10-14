import { Router } from "express";
import multer from "multer";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";
import {
  createPostWithMedia,
  getPostById,
  getAllPosts,
  getMyPosts,
  getFriendsPosts,
  getUserPostsById,
  deletePost,
} from "./post.controller.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.use(authMiddleware);

router.post("/", upload.single("media"), createPostWithMedia);

router.get("/all", getAllPosts);
router.get("/me", getMyPosts);
router.get("/friends", getFriendsPosts);
router.get("/:postId", getPostById);
router.get("/user/:userId", getUserPostsById);
router.delete("/:postId", deletePost);

export default router;
