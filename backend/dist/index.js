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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env = __importStar(require("dotenv"));
env.config();
// require("dotenv").config();
const express_1 = __importDefault(require("express"));
const TokenApi = __importStar(require("./loginApi"));
const { createServer, get } = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");
const config = require(path.join(__dirname, "../config.json"));
const app = (0, express_1.default)();
const server = createServer(app);
const io = new Server(server);
const crypto_1 = require("crypto");
const mongoApi_1 = require("./mongoApi");
const mongoApi = __importStar(require("./mongoApi"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//Session Handling
const sessionMiddleWare = session({
    secret: process.env.EXPRESS_SESSION_SECRET ||
        (0, crypto_1.generateKey)("hmac", { length: 256 }, (err, key) => {
            return key;
        }),
    resave: false,
    saveUninitialized: false,
});
app.use(sessionMiddleWare);
io.engine.use(sessionMiddleWare);
//Cookie Handling
const cookieParser = require("cookie-parser");
app.use(cookieParser());
//Static File Serving
app.use(express_1.default.static(path.join(__dirname, "../public")));
function fetchUser(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield mongoApi_1.client.db(mongoApi.mainDbName).collection(mongoApi.usersColName).findOne({ username: username });
            return result;
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
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
function startPuzzleRound() {
    try {
        let round = new PuzzleRound(10000, "PuzzleRoundId");
        console.log(Round.currentRound);
    }
    catch (err) {
        console.log(err);
    }
}
server.listen(Number(config.host_port), function () {
    console.log(server.address());
    console.log("server at http://localhost:%s/", server.address().port);
});
app.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("attempting login");
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        res.status(400).send("Missing Username or Password!");
        return;
    }
    let user = yield fetchUser(username);
    if (!user) {
        res.status(400).send("Incorrect Credentials!");
        return;
    }
    if (user.password !== password) {
        res.status(400).send("Incorrect Credentials!");
    }
    const id = TokenApi.loginTokenGroup.createNewToken(user);
    res.cookie("LoginToken", id, { secure: true, maxAge: TokenApi.loginTokenGroup.duration, httpOnly: true }).redirect("home");
}));
app.get("/login", (req, res) => {
    const loginTokenId = req.cookies["LoginToken"];
    if (loginTokenId && TokenApi.loginTokenGroup.findTokenOfId(loginTokenId)) {
        res.redirect("home");
        return;
    }
    res.sendFile(path.join(__dirname, "../public/login.html"));
});
app.get("/logout", (req, res) => {
    const loginTokenId = req.cookies["LoginToken"];
    if (loginTokenId) {
        TokenApi.loginTokenGroup.removeToken(loginTokenId);
        res.clearCookie("LoginToken");
    }
    res.redirect("login");
});
app.get("/home", TokenApi.validateLoginToken, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/home.html"));
});
app.get("/", (req, res) => {
    res.redirect("login");
});
const puzzleApi_1 = require("./puzzleApi");
app.use("/", puzzleApi_1.router);