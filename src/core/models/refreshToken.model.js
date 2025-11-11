// core/models/refreshToken.model.js
import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: { type: String, required: true },
  expires_at: { type: Date, required: true },
  created_at: { type: Date, default: Date.now },
  is_revoked: { type: Boolean, default: false },
});

export default mongoose.model("RefreshToken", RefreshTokenSchema);
