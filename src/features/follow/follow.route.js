import { Router } from "express";
import {
  followUser,
  unFollow,
  blockUser,
  getFollowList,
  getFollowerList,
  getFriendList,
  getBlockList,
} from "./follow.controller.js";
import authMiddleware from "../../shared/middlewares/auth.middleware.js";

const router = Router();

// Áp dụng auth cho tất cả route
router.use(authMiddleware);

// Follow / Unfollow / Block
router.post("/follow", followUser);
router.post("/unfollow", unFollow);
router.post("/block", blockUser);
router.get("/follow-list", getFollowList);
router.get("/follower-list", getFollowerList);
router.get("/friend-list", getFriendList);
router.get("/block-list", getBlockList);

export default router;
