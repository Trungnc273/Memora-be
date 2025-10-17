import environment from "../../core/configs/environment.js";
import UserModel from "../../core/models/user.model.js";
import RoleModel from "../../core/models/role.model.js";
import { createToken } from "./auth.util.js";

export async function signUp(request, response) {
  const { email, password, username, display_name } = request.body;

  try {
    const jwtSecret = environment.jwtSecret;
    if (!jwtSecret) throw new Error("Missing JWT_SECRET");

    const isUsernameExisted = await UserModel.findOne({ username });
    if (isUsernameExisted) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Username already exists" });
    }

    const isEmailExisted = await UserModel.findOne({ email });
    if (isEmailExisted) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Email already exists" });
    }

    let role = await RoleModel.findOne({ name: "USER" });
    if (!role) {
      role = await RoleModel.create({
        name: "USER",
        description: "User role",
      });
    }

    const user = await UserModel.create({
      email,
      password_hash: password,
      username,
      display_name,
      roles: [role._id],
    });

    const populatedUser = await user.populate("roles");

    const payload = {
      id: populatedUser._id,
      username: populatedUser.username,
      email: populatedUser.email,
      display_name: populatedUser.display_name,
      roles: populatedUser.roles.map((r) => r.name),
    };

    const token = createToken(jwtSecret, payload);

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
            id: populatedUser._id,
            email: populatedUser.email,
            display_name: populatedUser.display_name,
            roles: populatedUser.roles.map((r) => r.name),
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

    // ✅ Populate roles để lấy tên role
    const user = await UserModel.findOne({ username }).populate("roles");
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

    // ✅ Lấy tên các role sau khi populate
    const roles = user.roles.map((r) => r.name);

    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      roles, // lưu danh sách tên role vào JWT
    };

    const token = createToken(jwtSecret, payload);

    return response
      .status(200)
      .cookie("token", token, { httpOnly: true })
      .json({
        status: "OK",
        message: "SignIn successful",
        data: {
          token,
        },
      });
  } catch (err) {
    console.error("❌ signIn error:", err);
    return response
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
