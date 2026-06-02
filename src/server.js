const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });

const http = require("http");
const { Server: IOServer } = require('socket.io');
const connectDB = require("./config/db");
const app = require("./app");
const gameSocket = require('./sockets/gameSocket');

connectDB();

const preferredPort = Number(process.env.PORT) || 3000;

const createServer = (port) => {
  const server = http.createServer(app);

  // attach socket.io
  const io = new IOServer(server, { cors: { origin: '*' } });
  gameSocket(io);

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, trying ${nextPort}...`);
      createServer(nextPort);
      return;
    }

    console.error("Failed to start server:", error);
    process.exit(1);
  });

  server.listen(port, () => {
    const baseUrl = process.env.SERVER_URL || `http://localhost:${port}`;

    console.log(`
=================================
🚀 Server running on port ${port}
🌐 Base URL: ${baseUrl}
📄 Swagger: ${baseUrl}/api-docs
🎮 Test Client: ${baseUrl}/test-client.html
=================================
    `);
  });
};

createServer(preferredPort);
