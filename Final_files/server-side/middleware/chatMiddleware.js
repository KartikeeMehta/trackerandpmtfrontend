const jwt = require("jsonwebtoken");

const JWT_SECRET = "secret123"; // hardcoded secret

const chatMiddleware = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization?.split(" ")[1] || null);

    if (!token) {
      console.log("❌ No token provided in handshake");
      return next(new Error("Authentication error: No token provided"));
    }

    console.log("🔑 Verifying token:", token);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("✅ Token verified, decoded payload:", decoded);
      socket.user = decoded; // Attach user data to socket
      next();
    } catch (verifyError) {
      console.log("❌ JWT verify error:", verifyError.message);
      next(new Error("Authentication error: Invalid token"));
    }
  } catch (error) {
    console.log("❌ Unexpected error in auth middleware:", error);
    next(new Error("Authentication error"));
  }
};

module.exports = chatMiddleware;