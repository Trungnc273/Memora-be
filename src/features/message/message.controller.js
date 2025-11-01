import MessageModel from "../../core/models/message.model.js";
import ConversationModel from "../../core/models/conversation.model.js";
import PostModel from "../../core/models/post.model.js";

/**
 * 📩 Gửi tin nhắn mới
 */
export async function sendMessage(req, res) {
  try {
    const senderId = req.user.id;
    const { conversationId } = req.params;
    const { content, post_id } = req.body; // post_id là optional

    // === VALIDATE ===
    if (!conversationId || !content?.trim()) {
      return res.status(400).json({
        status: "ERROR",
        message: "conversationId and content are required",
      });
    }

    // === KIỂM TRA CONVERSATION ===
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || conversation.is_deleted) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conversation not found or deleted",
      });
    }

    if (!conversation.user.includes(senderId)) {
      return res.status(403).json({
        status: "ERROR",
        message: "You are not part of this conversation",
      });
    }

    // === KIỂM TRA POST (nếu có) ===
    let post = null;
    if (post_id) {
      post = await PostModel.findOne({
        _id: post_id,
        is_deleted: false,
        user_id: { $in: conversation.user }, // chỉ chia sẻ post trong nhóm
      });

      if (!post) {
        return res.status(400).json({
          status: "ERROR",
          message: "Post not found or not accessible",
        });
      }
    }

    // === TẠO TIN NHẮN ===
    const message = await MessageModel.create({
      sender: senderId,
      content: content.trim(),
      post: post?._id || null,
      message_type: "text", // luôn là text
    });

    // === CẬP NHẬT CONVERSATION ===
    conversation.message.push(message._id);
    conversation.updated_at = new Date();
    await conversation.save();

    // === POPULATE + TRẢ DỮ LIỆU ===
    const populatedMessage = await MessageModel.findById(message._id)
      .populate("sender", "_id display_name avatar_url")
      .populate({
        path: "post",
        match: { is_deleted: false },
        select: "caption",
        populate: {
          path: "media",
          match: { is_deleted: false },
          select: "url",
        },
      });

    const messageResponse = {
      _id: populatedMessage._id,
      sender: populatedMessage.sender,
      content: populatedMessage.content,
      message_type: "text",
      created_at: populatedMessage.created_at,
      post: populatedMessage.post
        ? {
            _id: populatedMessage.post._id,
            caption: populatedMessage.post.caption,
            media_url: populatedMessage.post.media.url || null,
          }
        : null,
    };

    // === SOCKET.IO ===
    if (global._io) {
      global._io.to(conversationId).except(senderId).emit("new_message", {
        conversationId,
        message: messageResponse,
      });
    }

    return res.status(201).json({
      status: "OK",
      message: "Message sent successfully",
      data: messageResponse,
    });
  } catch (err) {
    console.error("sendMessage error:", err);
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

    // Tìm cuộc trò chuyện
    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation || conversation.is_deleted) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conversation not found",
      });
    }

    // Lấy toàn bộ tin nhắn (không phân trang)
    const messages = await MessageModel.find({
      _id: { $in: conversation.message },
      is_delete: false,
    })
      .populate("sender", "_id display_name avatar_url")
      .populate({
        path: "post",
        match: { is_deleted: false },
        populate: {
          path: "media",
          match: { is_deleted: false },
          select: "url",
        },
        select: "caption",
      })
      .sort({ created_at: 1 }) // sắp xếp theo thời gian
      .lean();

    // Định dạng dữ liệu trả về
    const formattedMessages = messages.map((msg) => ({
      _id: msg._id,
      sender: msg.sender,
      content: msg.content,
      message_type: msg.message_type,
      created_at: msg.created_at,
      post: msg.post
        ? {
            _id: msg.post._id,
            caption: msg.post.caption,
            media_url: msg.post.media?.[0]?.url || null,
          }
        : null,
    }));

    return res.status(200).json({
      status: "OK",
      data: formattedMessages,
      total: formattedMessages.length,
    });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
