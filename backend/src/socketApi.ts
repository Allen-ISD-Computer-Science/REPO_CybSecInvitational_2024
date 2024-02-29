import { server, sessionMiddleWare } from "./server";
const { Server } = require("socket.io");
import { Socket } from "socket.io";

export const io = new Server(server);
io.engine.use(sessionMiddleWare);

export function init() {
  io.on("connection", (socket: Socket) => {
    console.log("a user connected!");
    socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
    });
  });

  io.on("disconnect", (socket: Socket) => {
    console.log("a user disconnected!");
  });
}
