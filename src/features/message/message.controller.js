import MessageModel from "../../core/models/message.model.js";
import ConversationModel from "../../core/models/conversation.model.js";

/**
 * 📩 Gửi tin nhắn mới
 */
export async function sendMessage(req, res) {
  console.log("🌍 Has IO:", !!global._io);
  try {
    const senderId = req.user.id;
    const { conversationId } = req.params;
    const { content, message_type = "text" } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({
        status: "ERROR",
        message: "conversationId and content are required",
      });
    }

    // Kiểm tra conversation có tồn tại và hợp lệ
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || conversation.is_deleted) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conversation not found or deleted",
      });
    }

    // Kiểm tra người gửi có thuộc conversation không
    if (!conversation.user.includes(senderId)) {
      return res.status(403).json({
        status: "ERROR",
        message: "You are not part of this conversation",
      });
    }

    // ✅ Tạo tin nhắn mới
    const message = await MessageModel.create({
      sender: senderId,
      content,
      message_type,
    });

    // ✅ Cập nhật vào conversation
    conversation.message.push(message._id);
    conversation.updated_at = new Date();
    await conversation.save();

    const messageData = {
      _id: message._id,
      sender: senderId,
      content,
      message_type,
      created_at: message.created_at,
    };

    // ✅ Gửi realtime qua socket chỉ cho người trong room
    if (global._io) {
      console.log(`📡 [Socket.IO] Emit new_message to room ${conversationId}`);
      global._io.to(conversationId).emit("new_message", {
        conversationId,
        message: messageData,
      });
    }

    return res.status(201).json({
      status: "OK",
      message: "Message sent successfully",
      data: messageData,
    });
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * 💬 Lấy tất cả tin nhắn trong conversation
 */
export async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const conversation = await ConversationModel.findById(conversationId)
      .populate({
        path: "message",
        populate: { path: "sender", select: "_id display_name avatar_url" },
      })
      .sort({ "message.created_at": 1 });

    if (!conversation) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      status: "OK",
      data: conversation.message,
    });
  } catch (err) {
    console.error("❌ getMessages error:", err);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
