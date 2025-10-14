import mongoose from "mongoose";

const { Schema, model } = mongoose;

const RolePermissionSchema = new Schema(
  {
    role: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    permission: {
      type: Schema.Types.ObjectId,
      ref: "Permission",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

export default model("RolePermission", RolePermissionSchema, "rolepermissions");
