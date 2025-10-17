import FollowModel from "../../core/models/follow.model.js";

export async function followUser(req, res) {
  try {
    const followerId = req.user.id;
    const { followeeId } = req.body;

    if (followerId === followeeId) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "You cannot follow yourself" });
    }

    // Check block
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

    // Check if follow exists
    let follow = await FollowModel.findOne({
      follower_id: followerId,
      followee_id: followeeId,
    });
    if (follow) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Follow request already exists" });
    }

    // Tạo follow pending
    follow = await FollowModel.create({
      follower_id: followerId,
      followee_id: followeeId,
      status: "pending",
    });

    // Kiểm tra ngược lại để xem có trở thành friend luôn không
    const reciprocal = await FollowModel.findOne({
      follower_id: followeeId,
      followee_id: followerId,
    });
    if (reciprocal) {
      follow.status = "accepted";
      reciprocal.status = "accepted";
      await follow.save();
      await reciprocal.save();
    }

    return res
      .status(201)
      .json({ status: "OK", message: "Follow request created", data: follow });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * Hủy follow / unfriend
 */
export async function unFollow(req, res) {
  try {
    const userA = req.user.id;
    const { userB } = req.body;

    await FollowModel.deleteMany({
      $or: [
        { follower_id: userA, followee_id: userB },
        { follower_id: userB, followee_id: userA },
      ],
    });

    return res
      .status(200)
      .json({ status: "OK", message: "Unfollowed / unfriend successfully" });
  } catch (err) {
    console.error(err);
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

    return res
      .status(200)
      .json({ status: "OK", message: "User blocked", data: block });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

// 1️⃣ Follow list (người bạn đang follow)
export async function getFollowList(req, res) {
  const userId = req.user.id;
  try {
    const followList = await FollowModel.find({
      follower_id: userId,
      status: { $in: ["pending", "accepted"] },
    }).populate("followee_id", "username display_name avatar_url");

    // Chỉ lấy thông tin user
    const result = followList.map((f) => f.followee_id);
    return res.status(200).json({ followList: result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

// 2️⃣ Follower list (người đang follow bạn)
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
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

// 3️⃣ Friend list (người đã chấp nhận follow 2 chiều)
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
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

// 4️⃣ Block list
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
    console.error(error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
