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
const testModule = require("./testModule");
require("dotenv").config();
require("crypto");
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
if (!process.env.MONGODB_USERNAME)
    throw Error("Process missing MongoDB Username");
if (!process.env.MONGODB_PASSWORD)
    throw Error("Process missing MongoDB Password");
if (!process.env.MAIN_DATABASE_NAME)
    throw Error("Missing main database name");
if (!process.env.USERS_COLLECTION)
    throw Error("Missing users collection name");
if (!process.env.PUZZLES_COLLECTION)
    throw Error("Missing puzzles collection name");
if (!process.env.BATTLE_ROUND_COLLECTION)
    throw Error("Missing battle round collection name");
if (!process.env.ADMINISTRATOR_COLLECTION)
    throw Error("Missing administrator collection name");
const mongo_username = encodeURIComponent(process.env.MONGODB_USERNAME);
const mongo_password = encodeURIComponent(process.env.MONGODB_PASSWORD);
const mainDbName = process.env.MAIN_DATABASE_NAME;
const usersColName = process.env.USERS_COLLECTION;
const puzzlesColName = process.env.PUZZLES_COLLECTION;
const battleRoundPuzzlesColName = process.env.BATTLE_ROUND_COLLECTION;
const adminColName = process.env.ADMINISTRATOR_COLLECTION;
const { MongoClient, ServerApiVersion } = require("mongodb");
const { generateKey, verify } = require("crypto");
const { cursorTo } = require("readline");
const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
// Close connection when server stops
process.on("SIGINT", () => {
    client.close().then(() => {
        console.info("Mongoose primary connection disconnected through app termination!");
        process.exit(0);
    });
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//Session Handling
const sessionMiddleWare = session({
    secret: process.env.EXPRESS_SESSION_SECRET ||
        generateKey("hmac", { length: 256 }, (err, key) => {
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
            const result = yield client.db(mainDbName).collection(usersColName).findOne({ username: username });
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
    const id = TokenApi.loginTokenGroup.createNewToken();
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
const puzzleRouter = require("./puzzleRoutes");
app.use("/", puzzleRouter);
