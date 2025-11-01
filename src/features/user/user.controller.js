import UserModel from "../../core/models/user.model.js";
import PostModel from "../../core/models/post.model.js";
import MediaModel from "../../core/models/media.model.js";
import { s3Client } from "../../core/configs/aws.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION;

export async function detail(request, response) {
  const userId = request.user.id;
  const user = await UserModel.findById(userId, { _id: 0, password: 0 });
  response.status(200).json({
    status: "OK",
    data: user,
  });
}

export async function updateDisplayName(request, response) {
  try {
    const userId = request.user.id;
    const { display_name } = request.body;

    // 1. Kiểm tra user có tồn tại không
    const user = await UserModel.findById(userId);
    if (!user) {
      return response.status(404).json({
        status: "ERROR",
        message: "User not found",
      });
    }

    // 2. Kiểm tra user có bị khóa không
    if (user.is_lock) {
      return response.status(403).json({
        status: "ERROR",
        message: "This account is locked and cannot be updated",
      });
    }

    // 3. Kiểm tra display_name hợp lệ
    if (display_name !== undefined) {
      if (typeof display_name !== "string") {
        return response.status(400).json({
          status: "ERROR",
          message: "display_name must be a string",
        });
      }

      const trimmedName = display_name.trim();
      if (trimmedName.length === 0) {
        return response.status(400).json({
          status: "ERROR",
          message: "display_name cannot be empty",
        });
      }

      if (trimmedName.length > 100) {
        return response.status(400).json({
          status: "ERROR",
          message: "display_name must not exceed 100 characters",
        });
      }

      user.display_name = trimmedName;
    }

    await user.save();

    return response.status(200).json({
      status: "OK",
      message: "Display name updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    return response.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

export async function uploadImage(request, response) {
  let s3Url = null;
  let oldAvatarKey = null;

  try {
    const userId = request.user.id; // ← Dùng biến đã khai báo

    // === 1. Tìm user ===
    const user = await UserModel.findById(userId);
    if (!user) {
      return response.status(404).json({
        status: "ERROR",
        message: "User not found",
      });
    }

    if (user.is_lock) {
      return response.status(403).json({
        status: "ERROR",
        message: "Account is locked",
      });
    }

    // === 2. Validate file ===
    if (!request.file) {
      return response.status(400).json({
        status: "ERROR",
        message: "Image file is required",
      });
    }

    const file = request.file;
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return response.status(400).json({
        status: "ERROR",
        message: "Only JPEG, PNG, WEBP allowed",
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB cho avatar
      return response.status(400).json({
        status: "ERROR",
        message: "Image too large. Max 5MB.",
      });
    }

    // === 3. Lấy key ảnh cũ (nếu có) ===
    if (user.avatar_url) {
      try {
        oldAvatarKey = user.avatar_url.split(
          `/${S3_BUCKET}.s3.${REGION}.amazonaws.com/`
        )[1];
      } catch {
        oldAvatarKey = null;
      }
    }

    // === 4. Tạo key mới ===
    const ext = file.originalname.split(".").pop();
    const fileKey = `avatars/${userId}/${uuidv4()}.${ext}`;

    // === 5. Upload S3 ===
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    let s3Response;
    try {
      s3Response = await s3Client.send(new PutObjectCommand(uploadParams));
      s3Url = `https://${S3_BUCKET}.s3.${REGION}.amazonaws.com/${fileKey}`;
      console.log("S3 Upload Success:", s3Response.ETag);
    } catch (s3Error) {
      console.error("S3 Upload Failed:", s3Error);
      return response.status(500).json({
        status: "ERROR",
        message: "Failed to upload to S3",
        error: s3Error.message,
      });
    }

    // === 6. Cập nhật DB ===
    user.avatar_url = s3Url;
    await user.save();

    // === 7. Xóa ảnh cũ ===
    if (oldAvatarKey) {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: oldAvatarKey,
          })
        );
        console.log("Old avatar deleted:", oldAvatarKey);
      } catch (e) {
        console.warn("Failed to delete old avatar:", e.message);
      }
    }

    // === 8. Response ===
    return response.status(200).json({
      status: "OK",
      message: "Avatar uploaded successfully",
      data: {
        url: s3Url,
        key: fileKey,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
  } catch (error) {
    // === 9. Rollback ===
    if (s3Url) {
      try {
        const key = s3Url.split(`/${S3_BUCKET}.s3.${REGION}.amazonaws.com/`)[1];
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          })
        );
        console.log("Rollback: New image deleted");
      } catch (e) {
        console.error("Rollback failed:", e);
      }
    }

    console.error("uploadImage] Error:", error);
    return response.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * @desc Xóa tài khoản (soft delete) - set is_deleted = true
 * @route DELETE /api/users/me
 * @access Private
 */
export async function deleteAccount(request, response) {
  try {
    const userId = request.user.id;

    // === 1. Tìm user ===
    const user = await UserModel.findById(userId);
    if (!user) {
      return response.status(404).json({
        status: "ERROR",
        message: "User not found",
      });
    }

    // === 2. Kiểm tra trạng thái ===
    if (user.is_deleted) {
      return response.status(400).json({
        status: "ERROR",
        message: "Account already deleted",
      });
    }

    if (user.is_lock) {
      return response.status(403).json({
        status: "ERROR",
        message: "Account is locked. Contact support to delete.",
      });
    }

    // === 3. Soft delete: set is_deleted = true ===
    user.is_deleted = true;
    user.deleted_at = new Date(); // Optional: thêm field nếu cần
    await user.save();

    // === 4. Optional: Xóa các dữ liệu liên quan (post, media, follow...) ===
    // Có thể chạy async job sau (dùng queue như BullMQ)
    // Ví dụ: ẩn tất cả post
    await PostModel.updateMany(
      { user_id: userId, is_deleted: false },
      { is_deleted: true, deleted_at: new Date() }
    );

    await MediaModel.updateMany(
      { user_id: userId, is_deleted: false },
      { is_deleted: true, deleted_at: new Date() }
    );

    // === 5. Response ===
    return response.status(200).json({
      status: "OK",
      message: "Account deleted successfully. You can recover within 30 days.",
    });
  } catch (error) {
    console.error("deleteAccount] Error:", error);
    return response.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
