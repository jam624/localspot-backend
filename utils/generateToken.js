import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: true,        // SameSite=None REQUIRES Secure — must be true always, not env-dependent.
                          // If your site is ever served over plain HTTP anywhere, this cookie
                          // silently gets dropped by every browser, Safari included.
    sameSite: "none",    // needed only if frontend/backend are on different domains
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return token;
};

export default generateToken;