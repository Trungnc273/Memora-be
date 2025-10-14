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
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

const RoleModel = model("Role", RoleSchema, "roles");

export default RoleModel;
