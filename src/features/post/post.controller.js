import PostModel from "../../core/models/post.model.js";
import MediaModel from "../../core/models/media.model.js";
import PostMediaModel from "../../core/models/post-media.model.js";
import FollowModel from "../../core/models/follow.model.js";
import { s3Client } from "../../core/configs/aws.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.AWS_S3_BUCKET;
/**
 * @desc Tạo post kèm 1 media
 * @route POST /api/posts
 */
export async function createPostWithMedia(req, res) {
  try {
    console.log("📥 [createPostWithMedia] Body:", req.body);
    console.log("📷 [createPostWithMedia] File:", req.file);
    console.log("🔐 [createPostWithMedia] User:", req.user);

    const { caption, visibility } = req.body;
    const user_id = req.user?.id;

    if (!user_id) {
      console.error("❌ User ID missing in token");
      return res.status(401).json({
        status: "ERROR",
        message: "Unauthorized: missing user_id",
      });
    }

    if (!req.file) {
      console.error("❌ Missing file upload");
      return res.status(400).json({
        status: "ERROR",
        message: "Media file is required",
      });
    }

    // 1️⃣ Upload file lên S3
    const file = req.file;
    const fileKey = `uploads/${user_id}/${Date.now()}_${file.originalname}`;

    console.log("⬆️ [S3 Upload] Preparing to upload:", fileKey);

    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const s3Response = await s3Client.send(
        new PutObjectCommand(uploadParams)
      );
      console.log("✅ [S3 Upload] Success:", s3Response);
    } catch (s3Error) {
      console.error("❌ [S3 Upload] Failed:", s3Error);
      return res.status(500).json({
        status: "ERROR",
        message: "Failed to upload file to S3",
        error: s3Error.message,
      });
    }

    const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    console.log("🌐 [S3 URL]:", s3Url);

    // 2️⃣ Tạo Media record
    const mediaDoc = await MediaModel.create({
      user_id,
      media_type: file.mimetype.startsWith("video") ? "video" : "image",
      storage_key: fileKey,
      url: s3Url,
      size_bytes: file.size,
      is_deleted: false,
      created_at: new Date(),
    });

    console.log("📦 [MongoDB] Media saved:", mediaDoc);

    // 3️⃣ Tạo Post
    const post = await PostModel.create({
      user_id,
      caption,
      visibility: visibility || "public",
      created_at: new Date(),
      is_deleted: false,
    });

    console.log("📝 [MongoDB] Post saved:", post);

    // 4️⃣ Tạo PostMedia mapping
    const postMedia = await PostMediaModel.create({
      post_id: post._id,
      media_id: mediaDoc._id,
    });

    console.log("🔗 [MongoDB] PostMedia created:", postMedia);

    return res.status(201).json({
      status: "OK",
      message: "✅ Post created with media uploaded to S3 successfully",
      data: { post, media: mediaDoc },
    });
  } catch (error) {
    console.error("❌ [createPostWithMedia] Unexpected error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
      error: error.message,
      stack: error.stack,
    });
  }
}

export async function getPostById(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user?.id; // người đang đăng nhập (nếu có)

    const post = await PostModel.findById(postId).lean();
    if (!post || post.is_deleted) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Post not found" });
    }

    // ✅ Kiểm tra quyền truy cập dựa trên visibility
    const visibility = post.visibility || "public"; // mặc định là public nếu chưa có
    const postOwnerId = post.user_id.toString();

    let canView = false;

    if (visibility === "public") {
      canView = true;
    } else if (visibility === "private") {
      // chỉ chủ bài viết mới được xem
      canView = userId === postOwnerId;
    } else if (visibility === "friends") {
      if (userId === postOwnerId) {
        canView = true;
      } else {
        // kiểm tra quan hệ bạn bè
        const isFriend = await FollowModel.exists({
          $or: [
            {
              follower_id: userId,
              followee_id: postOwnerId,
              status: "accepted",
            },
            {
              follower_id: postOwnerId,
              followee_id: userId,
              status: "accepted",
            },
          ],
        });
        canView = !!isFriend;
      }
    }

    if (!canView) {
      return res.status(403).json({
        status: "ERROR",
        message: "You do not have permission to view this post",
      });
    }

    // ✅ Nếu hợp lệ thì lấy media
    const postMedia = await PostMediaModel.findOne({
      post_id: postId,
    }).populate("media_id");
    const media = postMedia?.media_id || null;

    return res.status(200).json({
      status: "OK",
      data: { post, media },
    });
  } catch (error) {
    console.error("❌ getPostById error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

export async function getAllPosts(req, res) {
  try {
    const userId = req.user.id; // từ token
    console.log("👤 [getAllPosts] Current user:", userId);

    // 1️⃣ Lấy danh sách bạn bè hoặc người user theo dõi (tuỳ mô hình)
    const friends = await FollowModel.find({
      follower_id: userId,
      status: "accepted", // nếu có trạng thái follow
    }).select("followee_id");

    const friendIds = friends.map((f) => f.followee_id.toString());

    // 2️⃣ Lấy bài viết:
    // - của chính mình
    // - hoặc của bạn bè (visibility: public/friends)
    const posts = await PostModel.find({
      is_deleted: false,
      $or: [
        { user_id: userId },
        {
          user_id: { $in: friendIds },
          visibility: { $in: ["public", "friends"] },
        },
      ],
    })
      .sort({ created_at: -1 })
      .lean();

    // 3️⃣ Lấy media cho từng bài viết
    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        const pm = await PostMediaModel.findOne({ post_id: p._id }).populate(
          "media_id"
        );
        return { ...p, media: pm?.media_id || null };
      })
    );

    return res.status(200).json({ status: "OK", data: postsWithMedia });
  } catch (error) {
    console.error("❌ getAllPosts error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
export async function getMyPosts(req, res) {
  try {
    const userId = req.user.id;
    const posts = await PostModel.find({
      user_id: userId,
      is_deleted: false,
    }).lean();

    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        const pm = await PostMediaModel.findOne({ post_id: p._id }).populate(
          "media_id"
        );
        return { ...p, media: pm?.media_id || null };
      })
    );

    return res.status(200).json({ status: "OK", data: postsWithMedia });
  } catch (error) {
    console.error("❌ getMyPosts error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

export async function getFriendsPosts(req, res) {
  try {
    const userId = req.user.id;

    // Lấy id bạn bè
    const friends = await FollowModel.find({
      $or: [
        { follower_id: userId, status: "accepted" },
        { followee_id: userId, status: "accepted" },
      ],
    });

    const friendIds = friends.map((f) =>
      f.follower_id.toString() === userId ? f.followee_id : f.follower_id
    );

    // Lấy posts của bạn bè
    const posts = await PostModel.find({
      user_id: { $in: friendIds },
      visibility: { $in: ["public", "friend"] },
      is_deleted: false,
    }).lean();

    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        const pm = await PostMediaModel.findOne({ post_id: p._id }).populate(
          "media_id"
        );
        return { ...p, media: pm?.media_id || null };
      })
    );

    return res.status(200).json({ status: "OK", data: postsWithMedia });
  } catch (error) {
    console.error("❌ getFriendsPosts error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
export async function getUserPostsById(req, res) {
  try {
    const { userId } = req.params;
    const me = req.user.id;

    let visibilityFilter = ["public"];

    if (userId === me) {
      // Nếu xem chính bản thân → thấy tất cả (public + friend + private)
      visibilityFilter = ["public", "friends", "private"];
    } else {
      // Nếu không phải bản thân thì kiểm tra bạn bè
      const isFriend = await FollowModel.findOne({
        $or: [
          { follower_id: me, followee_id: userId, status: "accepted" },
          { follower_id: userId, followee_id: me, status: "accepted" },
        ],
      });

      if (isFriend) {
        visibilityFilter = ["public", "friends"];
      }
    }

    const posts = await PostModel.find({
      user_id: userId,
      visibility: { $in: visibilityFilter },
      is_deleted: false,
    })
      .sort({ created_at: -1 })
      .lean();

    const postsWithMedia = await Promise.all(
      posts.map(async (p) => {
        const pm = await PostMediaModel.findOne({ post_id: p._id }).populate(
          "media_id"
        );
        return { ...p, media: pm?.media_id || null };
      })
    );

    return res.status(200).json({ status: "OK", data: postsWithMedia });
  } catch (error) {
    console.error("❌ getUserPostsById error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

export async function deletePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user.id; // người đang đăng nhập

    // Tìm bài viết
    const post = await PostModel.findById(postId);
    if (!post || post.is_deleted) {
      return res
        .status(404)
        .json({ status: "ERROR", message: "Post not found" });
    }

    // Chỉ cho phép chủ bài viết xóa
    if (post.user_id.toString() !== userId) {
      return res
        .status(403)
        .json({
          status: "ERROR",
          message: "You are not allowed to delete this post",
        });
    }

    // Xóa mềm bài viết
    post.is_deleted = true;
    await post.save();

    // Xóa mềm media liên quan (nếu có)
    const postMedia = await PostMediaModel.find({ post_id: postId });
    if (postMedia && postMedia.length > 0) {
      for (const pm of postMedia) {
        if (pm.media_id) {
          await MediaModel.findByIdAndUpdate(pm.media_id, { is_deleted: true });
        }
        pm.is_deleted = true;
        await pm.save();
      }
    }

    return res.status(200).json({
      status: "OK",
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("❌ deletePost error:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
