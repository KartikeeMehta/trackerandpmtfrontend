const jwt = require("jsonwebtoken");

const JWT_SECRET = "secret123"; // hardcoded secret

const chatMiddleware = (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1] ||
      null;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.user = decoded; // Attach user data to socket
      next();
    } catch (verifyError) {
      return next(new Error("Authentication error: Invalid token"));
    }
  } catch (error) {
    return next(new Error("Authentication error"));
  }
};

module.exports = chatMiddleware;
