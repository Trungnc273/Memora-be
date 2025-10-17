import RoleModel from "../../core/models/role.model.js";
import PermissionModel from "../../core/models/permission.model.js";

/**
 * @desc Tạo mới Role
 * @route POST /api/roles
 */
export async function createRole(req, res) {
  try {
    const { name, description } = req.body;

    if (!name)
      return res.status(400).json({
        status: "ERROR",
        message: "Role name is required",
      });

    const existed = await RoleModel.findOne({ name });
    if (existed)
      return res.status(400).json({
        status: "ERROR",
        message: "Role already exists",
      });

    const newRole = await RoleModel.create({ name, description });

    return res.status(201).json({
      status: "OK",
      message: "Role created successfully",
      data: newRole,
    });
  } catch (error) {
    console.error("❌ createRole error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * @desc Lấy danh sách tất cả Role
 * @route GET /api/roles
 */
export async function getAllRoles(req, res) {
  try {
    const roles = await RoleModel.find();
    return res.status(200).json({
      status: "OK",
      data: roles,
    });
  } catch (error) {
    console.error("❌ getAllRoles error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * @desc Cập nhật Role
 * @route PUT /api/roles/:id
 */
export async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updated = await RoleModel.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({
        status: "ERROR",
        message: "Role not found",
      });

    return res.status(200).json({
      status: "OK",
      message: "Role updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ updateRole error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * @desc Xóa Role
 * @route DELETE /api/roles/:id
 */
export async function deleteRole(req, res) {
  try {
    const { id } = req.params;
    const deleted = await RoleModel.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({
        status: "ERROR",
        message: "Role not found",
      });

    return res.status(200).json({
      status: "OK",
      message: "Role deleted successfully",
    });
  } catch (error) {
    console.error("❌ deleteRole error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

/**
 * @desc Lấy tất cả Permission của một Role
 * @route GET /api/roles/:id/permissions
 */
export async function getRolePermissions(req, res) {
  try {
    const { id } = req.params;

    const role = await RoleModel.findById(id).populate("permissions").lean();
    if (!role)
      return res.status(404).json({
        status: "ERROR",
        message: "Role not found",
      });

    return res.status(200).json({
      status: "OK",
      data: role.permissions.map((perm) => ({
        name: perm.name,
        description: perm.description,
      })),
    });
  } catch (error) {
    console.error("❌ getRolePermissions error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
export async function addPermission(req, res) {
  try {
    const { id } = req.params;
    const { permissionId } = req.body;

    const role = await RoleModel.findById(id);
    if (!role) {
      return res.status(404).json({
        status: "ERROR",
        message: "Role not found",
      });
    }

    const permission = await PermissionModel.findById(permissionId);
    if (!permission) {
      return res.status(404).json({
        status: "ERROR",
        message: "Permission not found",
      });
    }

    if (role.permissions.includes(permissionId)) {
      return res.status(400).json({
        status: "ERROR",
        message: "Permission already assigned to this role",
      });
    }

    role.permissions.push(permissionId);
    await role.save();

    return res.status(201).json({
      status: "OK",
      message: "Permission added to role successfully",
      data: role,
    });
  } catch (error) {
    console.error("❌ addPermissionToRole error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

export async function removePermission(req, res) {
  try {
    const { id } = req.params; // role id
    const { permissionId } = req.body;

    // 🔹 Tìm role
    const role = await RoleModel.findById(id);
    if (!role) {
      return res.status(404).json({
        status: "ERROR",
        message: "Role not found",
      });
    }

    // 🔹 Kiểm tra xem permission có trong role không
    if (!role.permissions.includes(permissionId)) {
      return res.status(404).json({
        status: "ERROR",
        message: "Permission not assigned to this role",
      });
    }

    // 🔹 Xoá permission khỏi mảng
    role.permissions = role.permissions.filter(
      (permId) => permId.toString() !== permissionId
    );

    await role.save();

    return res.status(200).json({
      status: "OK",
      message: "Permission removed from role successfully",
      data: role,
    });
  } catch (error) {
    console.error("❌ removePermission error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
