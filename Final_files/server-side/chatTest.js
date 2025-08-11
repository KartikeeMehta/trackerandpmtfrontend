const io = require("socket.io-client");
const axios = require("axios");

(async () => {
  try {
    // Login to get JWT token
    const loginRes = await axios.post("http://localhost:8000/api/login", {
      email: "kartikee@digiwbs.com",  // Change as needed
      password: "1234567",             // Change as needed
    });

    const token = loginRes.data.token;
    console.log("✅ Login successful, token retrieved:", token);

    // Connect socket with token for authentication
    const socket = io("http://localhost:8000", {
      auth: { token },
      reconnection: false,
    });

    socket.on("connect", () => {
      console.log("✅ Connected to server");

      const testMessage = {
        message: "Hello from testChat.js!",
      };

      console.log("➡️ Sending sendMessage event:", testMessage.message);
      socket.emit("sendMessage", testMessage);
    });

    // Listen for messages from server
    socket.on("receiveMessage", (msg) => {
      console.log("⬅️ Received receiveMessage event:", msg);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Connection error:", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
    });

    // Close socket after 10 seconds to end test cleanly
   /*  setTimeout(() => {
      console.log("⏰ Closing socket after 10 seconds");
      socket.disconnect();
    }, 10000); */
  } catch (err) {
    console.error("❌ Error during login or connection:", err.message);
  }
})();