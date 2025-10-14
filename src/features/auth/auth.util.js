import jwt from "jsonwebtoken";

export function createToken(jwtSecret, user) {
  return jwt.sign(
    {
      id: user._id,
      userName: user.username,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "1h" }
  );
}
