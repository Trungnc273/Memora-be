import mongoose from "mongoose";

const { Schema, model } = mongoose;

const PermissionSchema = new Schema(
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

const PermissionModel = model("Permission", PermissionSchema, "permissions");

export default PermissionModel;
