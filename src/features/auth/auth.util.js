import jwt from "jsonwebtoken";

export function createToken(jwtSecret, user) {
  return jwt.sign(
    {
      id: user.id,
      userName: user.username,
      email: user.email,
      display_name: user.display_name,
      roles: Array.isArray(user.roles)
        ? user.roles.map((r) => (typeof r === "string" ? r : r.name))
        : [],
    },
    jwtSecret,
    { expiresIn: "1h" }
  );
}
