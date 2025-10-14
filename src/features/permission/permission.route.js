import { Router } from "express";
import {
  createPermission,
  updatePermission,
  deletePermission,
} from "./permission.controller.js";

const router = Router();

router.post("/", createPermission);

router.put("/:id", updatePermission);

router.delete("/:id", deletePermission);

export default router;
