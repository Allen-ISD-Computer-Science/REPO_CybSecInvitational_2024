"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.io = void 0;
const server_1 = require("./server");
const socket_io_1 = require("socket.io");
exports.io = new socket_io_1.Server(server_1.server);
exports.io.engine.use(server_1.sessionMiddleWare);
function init() {
    exports.io.on("connection", (socket) => {
        console.log("a user connected!");
        socket.on("connect_error", (error) => {
            console.error("Connection error:", error);
        });
    });
    exports.io.on("disconnect", (socket) => {
        console.log("a user disconnected!");
    });
}
exports.init = init;
