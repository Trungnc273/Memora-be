import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, maxlength: 64 },
    display_name: { type: String, maxlength: 100 },
    email: { type: String, required: true, unique: true, maxlength: 255 },
    password_hash: { type: String, required: true, maxlength: 255 },
    avatar_url: { type: String },
    is_deleted: { type: Boolean, default: false },
    is_lock: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// 🔒 Hash password trước khi lưu
UserSchema.pre("save", async function (next) {
  if (this.isModified("password_hash")) {
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
  }
  next();
});

// 🔍 So sánh mật khẩu
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// 👤 Tự tạo username nếu chưa có
UserSchema.pre("validate", function (next) {
  if (this.isNew && this.email && !this.username) {
    const hash = crypto.createHash("sha256").update(this.email).digest("hex");
    const suffix = parseInt(hash.substring(0, 8), 16);
    this.username = `user-${suffix}`;
  }
  next();
});

const UserModel = model("User", UserSchema, "users");

export default UserModel;
