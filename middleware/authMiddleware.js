import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";


const getToken = (req, cookieName) => {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  if (req.cookies && req.cookies[cookieName]) {
    return req.cookies[cookieName];
  }
  return null;
};

export const protect = asyncHandler(async (req, res, next) => {
  const token = getToken(req, "jwt");
  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no user token");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId  = decoded.userId || decoded.id; // ← handle both
    const user    = await User.findById(userId).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Not authorized, user token failed");
  }
});

