import environment from "../../core/configs/environment.js";
import UserModel from "../../core/models/user.model.js";
import RoleModel from "../../core/models/role.model.js";
import UserRoleModel from "../../core/models/user-role.model.js";
import { createToken } from "./auth.util.js";

export async function signUp(request, response) {
  const { email, password, username, display_name } = request.body;

  try {
    const jwtSecret = environment.jwtSecret;
    if (!jwtSecret) throw new Error("Missing JWT_SECRET");

    // 🔍 Kiểm tra username đã tồn tại chưa
    const isUsernameExisted = await UserModel.findOne({ username });
    if (isUsernameExisted) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Username already exists" });
    }

    // 🔍 Kiểm tra email đã tồn tại chưa
    const isEmailExisted = await UserModel.findOne({ email });
    if (isEmailExisted) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Email already exists" });
    }

    // 🚫 Không cho phép client gửi role — chỉ dùng mặc định
    let role = await RoleModel.findOne({ name: "USER" });
    if (!role) {
      role = await RoleModel.create({
        name: "USER",
        description: "User role",
      });
    }

    // 🧩 Tạo user mới
    const user = await UserModel.create({
      email,
      password_hash: password, // Schema tự hash
      username,
      display_name,
    });

    // 🔗 Gán role mặc định vào bảng user_role
    await UserRoleModel.create({
      user: user._id,
      role: role._id,
    });

    // 🔐 Sinh token JWT
    const token = createToken(jwtSecret, {
      id: user._id,
      email: user.email,
      role: role.name,
    });

    // 🍪 Lưu token vào cookie
    return response
      .status(201)
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      })
      .json({
        status: "OK",
        message: "SignUp successful",
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            display_name: user.display_name,
            role: role.name,
          },
        },
      });
  } catch (err) {
    console.error("❌ signUp error:", err);
    return response
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
export async function signIn(request, response) {
  const { username, password } = request.body;
  try {
    const jwtSecret = environment.jwtSecret;
    if (!jwtSecret) throw new Error("Missing JWT_SECRET");

    const user = await UserModel.findOne({ username });
    if (!user) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Username not existed" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Wrong password" });
    }

    const token = createToken(jwtSecret, user);

    return response
      .status(200)
      .cookie("token", token, { httpOnly: true })
      .json({ status: "OK", message: "SignIn successful", data: { token } });
  } catch (err) {
    console.error(err);
    return response
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
