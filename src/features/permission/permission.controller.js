import PermissionModel from "../../core/models/permission.model.js";

export async function createPermission(req, res) {
  try {
    const { name, description } = req.body;

    if (!name)
      return res.status(400).json({
        status: "ERROR",
        message: "Permission name is required",
      });

    const existed = await PermissionModel.findOne({ name });
    if (existed)
      return res.status(400).json({
        status: "ERROR",
        message: "Permission already exists",
      });

    const newPermission = await PermissionModel.create({ name, description });

    return res.status(201).json({
      status: "OK",
      message: "Permission created successfully",
      data: newPermission,
    });
  } catch (error) {
    console.error("❌ createPermission error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

export async function updatePermission(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const updated = await PermissionModel.findByIdAndUpdate(
      id,
      { name, description },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({
        status: "ERROR",
        message: "Permission not found",
      });

    return res.status(200).json({
      status: "OK",
      message: "Permission updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ updatePermission error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}

export async function deletePermission(req, res) {
  try {
    const { id } = req.params;
    const deleted = await PermissionModel.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({
        status: "ERROR",
        message: "Permission not found",
      });

    return res.status(200).json({
      status: "OK",
      message: "Permission deleted successfully",
    });
  } catch (error) {
    console.error("❌ deletePermission error:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Internal server error",
    });
  }
}
