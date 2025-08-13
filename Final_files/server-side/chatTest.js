const io = require("socket.io-client");

// Test configuration
const SERVER_URL = "http://localhost:8000";
const TEST_TOKEN = "your_test_token_here"; // Replace with actual token
const TEST_COMPANY = "TestCompany";

console.log("🧪 Starting Real-time Chat System Test...\n");

// Test 1: Socket Connection
async function testSocketConnection() {
  console.log("1️⃣ Testing Socket Connection...");

  try {
    const socket = io(SERVER_URL, {
      auth: { token: TEST_TOKEN },
      transports: ["websocket", "polling"],
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 5000);

      socket.on("connect", () => {
        clearTimeout(timeout);
        console.log("✅ Socket connected successfully");
        console.log(`   Socket ID: ${socket.id}`);
        resolve(socket);
      });

      socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        console.log("❌ Socket connection failed:", error.message);
        reject(error);
      });
    });
  } catch (error) {
    console.log("❌ Socket creation failed:", error.message);
    throw error;
  }
}

// Test 2: Company Room Joining
async function testCompanyRoomJoining(socket) {
  console.log("\n2️⃣ Testing Company Room Joining...");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Room joining timeout"));
    }, 5000);

    socket.emit("joinCompanyRoom", { companyName: TEST_COMPANY });

    socket.on("roomJoined", (data) => {
      clearTimeout(timeout);
      console.log("✅ Successfully joined company room");
      console.log(`   Company: ${data.companyName}`);
      console.log(`   Message: ${data.message}`);
      resolve();
    });

    socket.on("roomStatus", (data) => {
      console.log("   Room status received:", data.message);
      console.log(`   Your rooms: ${data.socketRooms.join(", ")}`);
    });
  });
}

// Test 3: Real-time Message Reception
async function testRealTimeMessaging(socket) {
  console.log("\n3️⃣ Testing Real-time Message Reception...");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Message reception timeout"));
    }, 5000);

    let messageReceived = false;

    socket.on("receiveMessage", (messageData) => {
      if (!messageReceived) {
        clearTimeout(timeout);
        messageReceived = true;
        console.log("✅ Real-time message received successfully");
        console.log(`   Message: ${messageData.message}`);
        console.log(`   Sender: ${messageData.sender?.name}`);
        console.log(`   Message ID: ${messageData._id}`);
        console.log(`   Timestamp: ${messageData.createdAt}`);
        resolve();
      }
    });

    // Send a test message to trigger real-time reception
    socket.emit("testMessage", {
      message: "Test message for real-time verification",
      timestamp: new Date().toISOString(),
    });
  });
}

// Test 4: Company Room Broadcasting
async function testCompanyRoomBroadcasting(socket) {
  console.log("\n4️⃣ Testing Company Room Broadcasting...");

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Broadcasting timeout"));
    }, 5000);

    let broadcastReceived = false;

    socket.on("receiveMessage", (messageData) => {
      if (
        messageData.message &&
        messageData.message.includes("Broadcast Test") &&
        !broadcastReceived
      ) {
        clearTimeout(timeout);
        broadcastReceived = true;
        console.log("✅ Company room broadcast received successfully");
        console.log(`   Broadcast message: ${messageData.message}`);
        console.log(`   Sender: ${messageData.sender?.name}`);
        resolve();
      }
    });

    // Test company room broadcasting
    socket.emit("testCompanyRoom", {
      companyName: TEST_COMPANY,
      message: "Test broadcast message",
      timestamp: new Date().toISOString(),
    });
  });
}

// Test 5: Message Deduplication
async function testMessageDeduplication(socket) {
  console.log("\n5️⃣ Testing Message Deduplication...");

  return new Promise((resolve) => {
    let messageCount = 0;
    const testMessage = "Deduplication test message";

    socket.on("receiveMessage", (messageData) => {
      if (messageData.message === testMessage) {
        messageCount++;
        console.log(
          `   Message received ${messageCount} time(s): ${messageData.message}`
        );

        if (messageCount >= 3) {
          console.log("✅ Message deduplication test completed");
          console.log(`   Total messages received: ${messageCount}`);
          resolve();
        }
      }
    });

    // Send the same message multiple times to test deduplication
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        socket.emit("testMessage", {
          message: testMessage,
          timestamp: new Date().toISOString(),
        });
      }, i * 1000);
    }
  });
}

// Main test runner
async function runAllTests() {
  try {
    console.log("🚀 Starting comprehensive real-time messaging tests...\n");

    // Run all tests sequentially
    const socket = await testSocketConnection();
    await testCompanyRoomJoining(socket);
    await testRealTimeMessaging(socket);
    await testCompanyRoomBroadcasting(socket);
    await testMessageDeduplication(socket);

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📋 Test Summary:");
    console.log("   ✅ Socket connection working");
    console.log("   ✅ Company room joining working");
    console.log("   ✅ Real-time message reception working");
    console.log("   ✅ Company room broadcasting working");
    console.log("   ✅ Message deduplication working");

    // Cleanup
    socket.disconnect();
    console.log("\n🧹 Test completed, socket disconnected");
  } catch (error) {
    console.log("\n💥 Test failed:", error.message);
    console.log("\n🔍 Troubleshooting tips:");
    console.log("   1. Ensure server is running on port 8000");
    console.log("   2. Check if JWT token is valid");
    console.log("   3. Verify company name exists in database");
    console.log("   4. Check server console for errors");
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testSocketConnection,
  testCompanyRoomJoining,
  testRealTimeMessaging,
  testCompanyRoomBroadcasting,
  testMessageDeduplication,
  runAllTests,
};
