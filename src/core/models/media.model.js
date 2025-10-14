import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MediaSchema = new Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    media_type: {
      type: String,
      required: [true, "Media type is required"],
      enum: {
        values: ["image", "video", "audio"],
        message: "Media type must be 'image', 'video', or 'audio'",
      },
    },
    storage_key: {
      type: String,
      required: [true, "Storage key is required"],
    },
    url: {
      type: String,
      required: [true, "URL is required"],
    },
    size_bytes: {
      type: Number,
      required: [true, "Size is required"],
      min: [0, "Size must be a positive number"],
    },
    is_deleted: { type: Boolean, default: false },
    width: {
      type: Number,
      min: [0, "Width must be positive"],
    },
    height: {
      type: Number,
      min: [0, "Height must be positive"],
    },
    duration_seconds: {
      type: Number,
      min: [0, "Duration must be positive"],
      validate: {
        validator: function (v) {
          // chỉ validate duration nếu media_type là video hoặc audio
          if (this.media_type === "video" || this.media_type === "audio") {
            return v != null;
          }
          return true; // hình ảnh không cần duration
        },
        message: "Duration is required for video/audio",
      },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// Tạo index để tìm kiếm media của user nhanh hơn
MediaSchema.index({ user_id: 1 });

const MediaModel = model("Media", MediaSchema, "medias");

export default MediaModel;
