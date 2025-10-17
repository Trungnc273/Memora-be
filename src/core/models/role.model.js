import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RoleSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      maxlength: 64,
    },
    description: {
      type: String,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const RoleModel = model("Role", RoleSchema, "roles");

export default RoleModel;
