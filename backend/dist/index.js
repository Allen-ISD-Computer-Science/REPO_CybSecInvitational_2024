"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const server_1 = require("./server");
const socketApi_1 = require("./socketApi");
const roundApi_1 = require("./roundApi");
const loginApi_1 = require("./loginApi");
const usersApi_1 = require("./usersApi");
const scoreboardApi_1 = require("./scoreboardApi");
const puzzleApi_1 = require("./puzzleApi");
const mongoApi_1 = require("./mongoApi");
const adminApi_1 = require("./adminApi");
server_1.app.use("*", (req, res, next) => {
    console.log(req.url, req.baseUrl);
    next();
});
const config = require(path.join(__dirname, "../config.json"));
// Initialize Routes
server_1.app.get("/home", loginApi_1.validateLoginToken, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/home.html"));
});
server_1.app.get("/", (req, res) => {
    res.redirect("login");
});
server_1.app.use("/", loginApi_1.router);
server_1.app.use("/", adminApi_1.router);
server_1.app.use("/", usersApi_1.router);
server_1.app.use("/", puzzleApi_1.router);
server_1.app.use("/", scoreboardApi_1.router);
// Initialize Socket Server
(0, socketApi_1.init)();
// Initialize Puzzles
(0, puzzleApi_1.replicatePuzzles)();
// Host http server at port
server_1.server.listen(Number(config.host_port), function () {
    console.log(server_1.server.address());
    console.log("server at http://localhost:%s/", server_1.server.address().port);
});
// Update Loop
setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
    const scoreboard = yield (0, mongoApi_1.fetchScoreboard)();
    if (!scoreboard) {
        console.warn("Failed to fetch scoreboard");
        return;
    }
    let updatePacket = {
        scoreboard: scoreboard,
        currentRound: roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.getSummary(),
    };
    socketApi_1.io.emit("update_event", updatePacket);
}), 5000);
// startPuzzleRound("TestPuzzleRound", 120000);
