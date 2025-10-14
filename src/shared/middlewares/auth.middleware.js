import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    return res.status(500).json({ message: "Internal server error" });
  }

  const authHeader = req.headers.authorization;
  console.log(authHeader);

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "No authentication token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

export default authMiddleware;
