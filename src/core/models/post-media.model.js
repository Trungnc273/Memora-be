import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PostMediaSchema = new Schema(
  {
    post_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: [true, "Post ID is required"],
    },
    media_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: [true, "Media ID is required"],
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

PostMediaSchema.index({ post_id: 1, media_id: 1 }, { unique: true });

const PostMediaModel = model("PostMedia", PostMediaSchema, "postmedias");

export default PostMediaModel;
