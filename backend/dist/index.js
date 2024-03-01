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
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const server_1 = require("./server");
const loginApi = __importStar(require("./loginApi"));
const userApi = __importStar(require("./usersApi"));
const puzzleApi = __importStar(require("./puzzleApi"));
const socketApi = __importStar(require("./socketApi"));
const config = require(path.join(__dirname, "../config.json"));
//#region Types
class Round {
    static endCurrentRound() {
        var _a;
        // * Callback is called before currentRound is set to null
        console.log("Attempting Round Closure");
        if (!Round.currentRound)
            throw Error("No Round In Session");
        clearTimeout(Round.currentRound._endTimeout); // Force stop timeout
        (_a = Round.currentRound) === null || _a === void 0 ? void 0 : _a.callback();
        Round.currentRound = null;
    }
    constructor(duration, type, id, callback = () => { }) {
        this.startTime = Date.now();
        this.endTime = this.startTime + duration;
        this.callback = callback;
        this.type = type;
        this.id = id;
        this._endTimeout = setTimeout(Round.endCurrentRound, duration);
    }
}
Round.currentRound = null;
class PuzzleRound extends Round {
    static _onEnd() {
        console.log("Puzzle Round Ended");
    }
    constructor(duration, id) {
        super(duration, "PuzzleRound", id, PuzzleRound._onEnd);
        this.type = "PuzzleRound";
        Round.currentRound = this;
    }
}
//#endregion
function startPuzzleRound() {
    try {
        let round = new PuzzleRound(10000, "PuzzleRoundId");
        console.log(Round.currentRound);
    }
    catch (err) {
        console.log(err);
    }
}
// Initialize Routes
server_1.app.get("/home", loginApi.validateLoginToken, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/home.html"));
});
server_1.app.get("/", (req, res) => {
    res.redirect("login");
});
server_1.app.use("/", loginApi.router);
server_1.app.use("/", puzzleApi.router);
server_1.app.use("/", userApi.router);
// Initialize Socket Server
socketApi.init();
// Initialize Puzzles
puzzleApi.replicatePuzzles();
// Host http server at port
server_1.server.listen(Number(config.host_port), function () {
    console.log(server_1.server.address());
    console.log("server at http://localhost:%s/", server_1.server.address().port);
});
// Update Loop
setInterval(() => {
    console.log("updating");
}, 5000);
