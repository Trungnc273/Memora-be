import MediaModel from "../../core/models/media.model.js";

/**
 * @desc Lấy tất cả media của user
 * @route GET /api/media/user/:userId
 */
export async function getUserMedia(req, res) {
  try {
    const { userId } = req.params;
    const mediaList = await MediaModel.find({
      user_id: userId,
      is_deleted: false,
    });

    return res.status(200).json({
      status: "OK",
      data: mediaList,
    });
  } catch (error) {
    console.error("❌ getUserMedia error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
/**
 * @desc Lấy media theo id
 * @route GET /api/media/:id
 */
export async function getMediaById(req, res) {
  try {
    const { id } = req.params;
    const media = await MediaModel.findOne({ _id: id, is_deleted: false });

    if (!media)
      return res.status(404).json({
        status: "ERROR",
        message: "Media not found",
      });

    return res.status(200).json({
      status: "OK",
      data: media,
    });
  } catch (error) {
    console.error("❌ getMediaById error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
