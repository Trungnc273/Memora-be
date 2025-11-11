// controllers/follow.controller.js
import FollowModel from "../../core/models/follow.model.js";
import ConversationModel from "../../core/models/conversation.model.js";

/**
 * Helper: tính số bạn bè (accepted) cho 1 user
 * Trả về số (Number)
 */
async function getFriendCount(userId) {
  console.log("🌍 Has IO:", !!global._io);
  const friendsRaw = await FollowModel.find({
    $or: [
      { follower_id: userId, status: "accepted" },
      { followee_id: userId, status: "accepted" },
    ],
  }).select("follower_id followee_id");

  const set = new Set();
  friendsRaw.forEach((f) => {
    const a = f.follower_id?.toString?.();
    const b = f.followee_id?.toString?.();
    if (a && a !== userId) set.add(a);
    if (b && b !== userId) set.add(b);
  });

  return set.size;
}

/**
 * Gửi event qua socket (nếu global._io tồn tại)
 * roomName: ví dụ `user:123`
 * event: tên event
 * payload: object
 */
function emitToRoom(roomName, event, payload) {
  try {
    if (global._io && global._io.to) {
      global._io.to(roomName).emit(event, payload);
    } else {
      // fallback: emit global (giống logic post của bạn) - nhưng tránh spam
      if (global._io && global._io.emit) {
        global._io.emit(event, payload);
      }
    }
  } catch (e) {
    console.warn("Socket emit error:", e);
  }
}

/**
 * Thực hiện follow / accept follow
 */
export async function followUser(req, res) {
  try {
    const followerId = req.user.id;
    const { followeeId } = req.body;

    if (!followeeId) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing followeeId" });
    }

    if (followerId === followeeId) {
      return res.status(400).json({
        status: "ERROR",
        message: "You cannot follow yourself",
      });
    }

    // Kiểm tra block
    const blocked = await FollowModel.findOne({
      $or: [
        { follower_id: followerId, followee_id: followeeId, status: "blocked" },
        { follower_id: followeeId, followee_id: followerId, status: "blocked" },
      ],
    });
    if (blocked) {
      return res.status(403).json({
        status: "ERROR",
        message: "You cannot follow this user (blocked)",
      });
    }

    // Kiểm tra follow 1 chiều giữa 2 người (bất kỳ hướng)
    const existingFollow = await FollowModel.findOne({
      $or: [
        { follower_id: followerId, followee_id: followeeId },
        { follower_id: followeeId, followee_id: followerId },
      ],
    });

    if (existingFollow) {
      // 1. Người kia đã gửi request trước → accept
      if (
        existingFollow.follower_id.toString() === followeeId &&
        existingFollow.status === "pending"
      ) {
        existingFollow.status = "accepted";
        await existingFollow.save();

        // Kiểm tra / tạo conversation 1-1
        const existingConversation = await ConversationModel.findOne({
          is_group: false,
          user: { $all: [followerId, followeeId], $size: 2 },
        });
        if (!existingConversation) {
          await ConversationModel.create({
            user: [followerId, followeeId],
            is_group: false,
          });
        }

        // Emit socket: thông báo accepted cho cả 2 người
        try {
          const [countA, countB] = await Promise.all([
            getFriendCount(followerId),
            getFriendCount(followeeId),
          ]);

          emitToRoom(`user:${followerId}`, "friend:update", {
            type: "accepted",
            newCount: countA,
            otherId: followeeId,
          });
          emitToRoom(`user:${followeeId}`, "friend:update", {
            type: "accepted",
            newCount: countB,
            otherId: followerId,
          });
        } catch (e) {
          console.warn("Emit error after accept:", e);
        }

        return res.status(200).json({
          status: "OK",
          message: "Follow request accepted and conversation created (if new)",
          data: existingFollow,
        });
      }

      // 2. Đã là bạn bè rồi
      if (existingFollow.status === "accepted") {
        return res.status(400).json({
          status: "ERROR",
          message: "You are already friends",
        });
      }

      // 3. Mình đã gửi request rồi
      if (
        existingFollow.follower_id.toString() === followerId &&
        existingFollow.status === "pending"
      ) {
        return res.status(400).json({
          status: "ERROR",
          message: "Follow request already sent",
        });
      }
    }

    // Nếu chưa có follow nào → tạo mới pending
    const newFollow = await FollowModel.create({
      follower_id: followerId,
      followee_id: followeeId,
      status: "pending",
    });

    // Emit socket: thông báo cho followee có request mới
    try {
      const countFollower = await getFriendCount(followerId);
      const countFollowee = await getFriendCount(followeeId);

      emitToRoom(`user:${followeeId}`, "friend:pending", {
        type: "pending",
        fromId: followerId,
        newCount: countFollowee,
      });

      // Cập nhật tabbar cho cả 2 (optionally)
      emitToRoom(`user:${followerId}`, "friend:update", {
        type: "request_sent",
        newCount: countFollower,
        otherId: followeeId,
      });
      emitToRoom(`user:${followeeId}`, "friend:update", {
        type: "request_received",
        newCount: countFollowee,
        otherId: followerId,
      });
    } catch (e) {
      console.warn("Emit error after create pending:", e);
    }

    return res.status(201).json({
      status: "OK",
      message: "Follow request sent",
      data: newFollow,
    });
  } catch (err) {
    console.error("❌ Follow Error:", err);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * Hủy follow / unfriend
 */
export async function unFollow(req, res) {
  try {
    const userA = req.user.id;
    const { userB } = req.body;

    if (!userB) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing userB" });
    }

    await FollowModel.deleteMany({
      $or: [
        { follower_id: userA, followee_id: userB },
        { follower_id: userB, followee_id: userA },
      ],
    });

    // Emit cập nhật số bạn cho cả 2
    try {
      const [countA, countB] = await Promise.all([
        getFriendCount(userA),
        getFriendCount(userB),
      ]);

      emitToRoom(`user:${userA}`, "friend:update", {
        type: "unfollow",
        newCount: countA,
        otherId: userB,
      });
      emitToRoom(`user:${userB}`, "friend:update", {
        type: "unfollow",
        newCount: countB,
        otherId: userA,
      });
    } catch (e) {
      console.warn("Emit error after unfollow:", e);
    }

    return res
      .status(200)
      .json({ status: "OK", message: "Unfollowed / unfriend successfully" });
  } catch (err) {
    console.error("❌ unFollow Error:", err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * Block user
 */
export async function blockUser(req, res) {
  try {
    const blockerId = req.user.id;
    const { blockedId } = req.body;

    if (!blockedId) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing blockedId" });
    }

    // Xóa mọi follow giữa 2 người
    await FollowModel.deleteMany({
      $or: [
        { follower_id: blockerId, followee_id: blockedId },
        { follower_id: blockedId, followee_id: blockerId },
      ],
    });

    // Tạo record block
    const block = await FollowModel.create({
      follower_id: blockerId,
      followee_id: blockedId,
      status: "blocked",
    });

    // Emit cập nhật cho cả 2
    try {
      const [countA, countB] = await Promise.all([
        getFriendCount(blockerId),
        getFriendCount(blockedId),
      ]);

      emitToRoom(`user:${blockerId}`, "friend:update", {
        type: "block",
        newCount: countA,
        otherId: blockedId,
      });
      emitToRoom(`user:${blockedId}`, "friend:update", {
        type: "blocked_by",
        newCount: countB,
        otherId: blockerId,
      });
    } catch (e) {
      console.warn("Emit error after block:", e);
    }

    return res
      .status(200)
      .json({ status: "OK", message: "User blocked", data: block });
  } catch (err) {
    console.error("❌ blockUser Error:", err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * Follow list (người bạn đang follow)
 */
export async function getFollowList(req, res) {
  const userId = req.user.id;
  try {
    const followList = await FollowModel.find({
      follower_id: userId,
      status: "pending",
    }).populate("followee_id", "username display_name avatar_url");

    const result = followList.map((f) => f.followee_id);
    return res.status(200).json({ followList: result });
  } catch (error) {
    console.error("❌ getFollowList Error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * Follower list (người đang follow bạn)
 */
export async function getFollowerList(req, res) {
  const userId = req.user.id;
  try {
    const followerList = await FollowModel.find({
      followee_id: userId,
      status: "pending",
    }).populate("follower_id", "username display_name avatar_url");

    const result = followerList.map((f) => f.follower_id);
    return res.status(200).json({ followerList: result });
  } catch (error) {
    console.error("❌ getFollowerList Error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * Friend list (người đã chấp nhận follow 2 chiều)
 */
export async function getFriendList(req, res) {
  const userId = req.user.id;
  try {
    const friendsRaw = await FollowModel.find({
      $or: [
        { follower_id: userId, status: "accepted" },
        { followee_id: userId, status: "accepted" },
      ],
    }).populate("follower_id followee_id", "username display_name avatar_url");

    const friendSet = new Set();
    friendsRaw.forEach((f) => {
      if (f.follower_id._id.toString() !== userId)
        friendSet.add(JSON.stringify(f.follower_id));
      if (f.followee_id._id.toString() !== userId)
        friendSet.add(JSON.stringify(f.followee_id));
    });

    const friendList = Array.from(friendSet).map((s) => JSON.parse(s));
    return res.status(200).json({ friendList });
  } catch (error) {
    console.error("❌ getFriendList Error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * Block list
 */
export async function getBlockList(req, res) {
  const userId = req.user.id;
  try {
    const blockListRaw = await FollowModel.find({
      follower_id: userId,
      status: "blocked",
    }).populate("followee_id", "username display_name avatar_url");

    const blockList = blockListRaw.map((f) => f.followee_id);
    return res.status(200).json({ blockList });
  } catch (error) {
    console.error("❌ getBlockList Error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
