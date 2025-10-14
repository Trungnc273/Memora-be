import express from "express";
import {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
  getRolePermissions,
  addPermission,
  removePermission,
} from "../role/role.controller.js";

const router = express.Router();

router.post("/", createRole);
router.get("/", getAllRoles);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);
router.get("/:id/permissions", getRolePermissions);
router.post("/:id/add-permission", addPermission);
router.delete("/:id/remove-permission", removePermission);
export default router;
