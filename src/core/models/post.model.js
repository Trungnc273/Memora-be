import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PostSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: [true, "Media ID is required"],
    },
    caption: {
      type: String,
      maxlength: [255, "Caption cannot exceed 255 characters"],
    },
    visibility: {
      type: String,
      enum: ["public", "private", "friends"],
      default: "public",
      required: [true, "Visibility is required"],
    },
    is_deleted: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Tạo index để tìm kiếm post theo user nhanh hơn
PostSchema.index({ user_id: 1, created_at: -1 });

const PostModel = model("Post", PostSchema, "posts");

export default PostModel;
