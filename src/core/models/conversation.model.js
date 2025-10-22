import mongoose from "mongoose";

const { Schema, model } = mongoose;

const ConversationSchema = new Schema({
  is_group: { type: Boolean, default: false },
  user: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 1,
      message: "Conversation must have at least two user",
    },
  },
  created_at: { type: Date, default: Date.now },
  is_deleted: { type: Boolean, default: false },
  message: {
    type: [{ type: Schema.Types.ObjectId, ref: "Message" }],
    default: [],
  },
});

const ConversationModel = model(
  "Conversation",
  ConversationSchema,
  "conversations"
);
export default ConversationModel;
