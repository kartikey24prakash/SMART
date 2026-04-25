import jwt from "jsonwebtoken";

import User from "../model/User.js";

const optionalAuthMiddleware = async (req, _res, next) => {
  try {
    const token =
      req.cookies?.token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await User.findById(decoded.userId).select("-password");

    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // Ignore invalid optional auth and continue as anonymous.
  }

  next();
};

export default optionalAuthMiddleware;
