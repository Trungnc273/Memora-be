import http from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./core/configs/application.js";
import database from "./core/configs/database.js";
import environment from "./core/configs/environment.js";

export const server = async () => {
  try {
    await database();

    const httpServer = http.createServer(app);

    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
      },
    });

    io.on("connection", (socket) => {
      console.log("🔌 Client connected:", socket.id);

      socket.on("join_room", (roomId) => {
        socket.join(roomId);
        console.log(`📥 Socket ${socket.id} joined room ${roomId}`);
      });

      socket.on("leave_room", (roomId) => {
        socket.leave(roomId);
        console.log(`📤 Socket ${socket.id} left room ${roomId}`);
      });

      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
      });
    });

    global._io = io;
    console.log("🌍 [Socket.IO] Global io instance created");
    httpServer.listen(environment.serverPort, () => {
      console.log(`🚀 Server is running on port ${environment.serverPort}`);
    });
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
};

export default server;
