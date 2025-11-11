import jwt from "jsonwebtoken";
import crypto from "crypto";

export function createAccessToken(jwtSecret, user, opts = {}) {
  return jwt.sign(
    {
      id: user.id,
      userName: user.username,
      email: user.email,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      roles: Array.isArray(user.roles)
        ? user.roles.map((r) => (typeof r === "string" ? r : r.name))
        : [],
    },
    jwtSecret,
    { expiresIn: opts.expiresIn || "24h" }
  );
}

export function generateRefreshTokenValue() {
  // token dài, khó đoán
  return crypto.randomBytes(64).toString("hex");
}

export function refreshTokenExpiryDate({ days = 7 } = {}) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
