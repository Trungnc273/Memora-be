// core/models/message.model.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MessageSchema = new Schema({
  sender: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Sender is required"],
  },
  content: {
    type: String,
    trim: true,
  },
  post: {
    type: Schema.Types.ObjectId,
    ref: "Post",
    default: null,
  },
  message_type: {
    type: String,
    enum: ["text", "image", "video", "post"],
    default: "text",
  },
  created_at: { type: Date, default: Date.now },
  is_read: { type: Boolean, default: false },
  is_delete: { type: Boolean, default: false },
});

// Index để tìm nhanh
MessageSchema.index({ post: 1 });
MessageSchema.index({ sender: 1, created_at: -1 });

const MessageModel = model("Message", MessageSchema, "messages");

export default MessageModel;
