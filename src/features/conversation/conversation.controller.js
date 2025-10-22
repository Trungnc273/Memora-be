import ConversationModel from "../../core/models/conversation.model.js";
import MessageModel from "../../core/models/message.model.js";

/**
 * 📍 Tạo cuộc trò chuyện mới (2 người hoặc nhóm)
 */
// export async function createConversation(req, res) {
//   try {
//     const { userIds, is_group = false } = req.body;

//     if (!userIds || !Array.isArray(userIds) || userIds.length < 2) {
//       return res.status(400).json({
//         status: "ERROR",
//         message: "Conversation must have at least two users",
//       });
//     }

//     if (!is_group) {
//       const existing = await ConversationModel.findOne({
//         is_group: false,
//         user: { $all: userIds, $size: 2 },
//       });

//       if (existing) {
//         return res.status(200).json({
//           status: "OK",
//           message: "Conversation already exists",
//           data: existing,
//         });
//       }
//     }

//     const conversation = await ConversationModel.create({
//       user: userIds,
//       is_group,
//     });

//     return res.status(201).json({
//       status: "OK",
//       message: "Conversation created successfully",
//       data: conversation,
//     });
//   } catch (err) {
//     console.error("❌ createConversation error:", err);
//     return res
//       .status(500)
//       .json({ status: "ERROR", message: "Internal server error" });
//   }
// }

/**
 * 📍 Lấy danh sách conversation của người dùng hiện tại
 */

export async function getUserConversations(req, res) {
  try {
    const userId = req.user.id;

    // 🔹 Lấy các conversation có userId tham gia
    const conversations = await ConversationModel.find({
      user: userId,
      is_deleted: false,
    })
      .populate("user", "_id display_name avatar_url")
      .populate({
        path: "message",
        select: "_id content created_at",
        options: { sort: { created_at: -1 }, limit: 1 }, // chỉ lấy tin nhắn mới nhất
      })
      .sort({ created_at: -1 });

    // 🔹 Xử lý dữ liệu trả về
    const formatted = conversations.map((conv) => {
      const otherUsers = conv.user.filter((u) => u._id.toString() !== userId);

      return {
        _id: conv._id,
        is_group: conv.is_group,
        user: otherUsers.length > 0 ? otherUsers[0] : null,
        last_message:
          conv.message && conv.message.length > 0 ? conv.message[0] : null,
      };
    });

    return res.status(200).json({
      status: "OK",
      data: formatted,
    });
  } catch (err) {
    console.error("❌ getUserConversations error:", err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * 📍 Xoá conversation (đánh dấu là deleted)
 */
export async function deleteConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await ConversationModel.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        status: "ERROR",
        message: "Conversation not found",
      });
    }

    if (!conversation.user.some((u) => u.toString() === userId)) {
      return res.status(403).json({
        status: "ERROR",
        message: "You are not in this conversation",
      });
    }

    conversation.is_deleted = true;
    await conversation.save();

    return res.status(200).json({
      status: "OK",
      message: "Conversation deleted successfully",
    });
  } catch (err) {
    console.error("❌ deleteConversation error:", err);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
