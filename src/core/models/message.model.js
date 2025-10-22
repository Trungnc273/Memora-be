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
    required: [true, "Content cannot be empty"],
    trim: true,
  },
  post: { type: Schema.Types.ObjectId, ref: "Post" },
  message_type: {
    type: String,
    enum: ["text", "image", "video"],
    default: "text",
  },
  created_at: { type: Date, default: Date.now },
  is_read: { type: Boolean, default: false },
  is_delete: { type: Boolean, default: false },
});

const MessageModel = model("Message", MessageSchema, "messages");

export default MessageModel;
