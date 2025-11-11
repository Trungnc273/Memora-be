import environment from "../../core/configs/environment.js";
import UserModel from "../../core/models/user.model.js";
import RoleModel from "../../core/models/role.model.js";
import RefreshTokenModel from "../../core/models/refreshToken.model.js";
import { createAccessToken, refreshTokenExpiryDate } from "./auth.util.js";

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

    const token = createAccessToken(jwtSecret, payload, { expiresIn: "24h" });

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

    const user = await UserModel.findOne({ username }).populate("roles");

    if (!user) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Username not existed" });
    }

    if (user.is_deleted) {
      return response.status(400).json({
        status: "ERROR",
        message:
          "This account has been deleted. Please contact support to recover.",
      });
    }

    if (user.is_lock) {
      return response.status(400).json({
        status: "ERROR",
        message: "This account is locked. Please contact support.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return response
        .status(400)
        .json({ status: "ERROR", message: "Wrong password" });
    }

    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      roles: user.roles.map((r) => r.name),
    };

    // Tạo access token (ngắn hạn)
    const accessToken = createAccessToken(jwtSecret, payload, {
      expiresIn: "24h",
    });

    // Tạo refresh token (dài hạn), lưu DB
    const expiresAt = refreshTokenExpiryDate({ days: 7 });

    await RefreshTokenModel.create({
      user_id: user._id,
      token: accessToken,
      expires_at: expiresAt,
    });

    return response.status(200).json({
      status: "OK",
      message: "SignIn successful",
      data: {
        token: accessToken,
      },
    });
  } catch (err) {
    console.error("❌ signIn error:", err);
    return response
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * REFRESH TOKEN - exchange refresh token -> new access token (and rotate refresh token)
 */
export async function refreshToken(request, response) {
  try {
    const jwtSecret = environment.jwtSecret;
    if (!jwtSecret) throw new Error("Missing JWT_SECRET");

    const incoming = request.body?.refreshToken;
    if (!incoming) {
      return response
        .status(401)
        .json({ status: "ERROR", message: "Refresh token not provided" });
    }

    const stored = await RefreshTokenModel.findOne({ token: incoming });
    if (!stored) {
      return response
        .status(401)
        .json({ status: "ERROR", message: "Invalid refresh token" });
    }

    if (stored.is_revoked) {
      return response
        .status(401)
        .json({ status: "ERROR", message: "Refresh token revoked" });
    }

    if (new Date() > stored.expires_at) {
      return response
        .status(401)
        .json({ status: "ERROR", message: "Refresh token expired" });
    }

    const user = await UserModel.findById(stored.user_id).populate("roles");
    if (!user) {
      return response
        .status(401)
        .json({ status: "ERROR", message: "User not found for this token" });
    }

    // Tạo access token mới
    const payload = {
      id: user._id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      roles: user.roles.map((r) => r.name),
    };
    const newAccessToken = createAccessToken(jwtSecret, payload, {
      expiresIn: "24d",
    });

    // Rotation: tạo refresh token mới, revoke token cũ
    const newExpiresAt = refreshTokenExpiryDate({ days: 7 });

    // mark current as revoked
    stored.is_revoked = true;
    await stored.save();

    // create new record
    await RefreshTokenModel.create({
      user_id: user._id,
      token: newAccessToken,
      expires_at: newExpiresAt,
    });

    return response.status(200).json({
      status: "OK",
      message: "Token refreshed",
      data: {
        token: newAccessToken,
      },
    });
  } catch (err) {
    console.error("❌ refreshToken error:", err);
    return response
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}

/**
 * SIGN OUT -> revoke refresh token (nếu có) và clear cookies
 */
export async function signOut(request, response) {
  try {
    const incoming = request.body?.token;
    if (incoming) {
      const stored = await RefreshTokenModel.findOne({ token: incoming });
      if (stored) {
        stored.is_revoked = true;
        await stored.save();
      }
    }

    response.clearCookie("refreshToken");

    return response.status(200).json({
      status: "OK",
      message: "SignOut successful (token(s) revoked, cookies cleared)",
    });
  } catch (err) {
    console.error("❌ signOut error:", err);
    return response
      .status(500)
      .json({ status: "ERROR", message: "Internal server error" });
  }
}
