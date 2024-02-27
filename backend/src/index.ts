import { ObjectId } from "mongodb";

const testModule = require("./testModule");

require("dotenv").config();
require("crypto");

import express from "express";
import { Request, Response } from "express";
import { Socket } from "socket.io";
import * as TokenApi from "./loginApi";

const { createServer, get } = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");

const config = require(path.join(__dirname, "../config.json"));

const app = express();
const server = createServer(app);
const io = new Server(server);

if (!process.env.MONGODB_USERNAME) throw Error("Process missing MongoDB Username");
if (!process.env.MONGODB_PASSWORD) throw Error("Process missing MongoDB Password");
if (!process.env.MAIN_DATABASE_NAME) throw Error("Missing main database name");
if (!process.env.USERS_COLLECTION) throw Error("Missing users collection name");
if (!process.env.PUZZLES_COLLECTION) throw Error("Missing puzzles collection name");
if (!process.env.BATTLE_ROUND_COLLECTION) throw Error("Missing battle round collection name");
if (!process.env.ADMINISTRATOR_COLLECTION) throw Error("Missing administrator collection name");

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
  secret:
    process.env.EXPRESS_SESSION_SECRET ||
    generateKey("hmac", { length: 256 }, (err: Error, key: string) => {
      return key;
    }),
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleWare);
io.engine.use(sessionMiddleWare);

declare module "express-session" {
  interface SessionData {
    username: string;
  }
}

//Cookie Handling
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//Static File Serving
app.use(express.static(path.join(__dirname, "../public")));

async function fetchUser(username: string): Promise<User | null> {
  try {
    const result = await client.db(mainDbName).collection(usersColName).findOne({ username: username });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

type User = {
  _id: ObjectId;
  division: 0 | 1 | 2; // Silver, Gold, Platinum
  username: string;
  password: string;
  completed_puzzles: { String: boolean };
  puzzle_points: number;
  scenario_points: number;
};

//TODO Add categories to Puzzle class
type Puzzle = {
  _id: ObjectId;
  name: string;
  description: string;
  point_value: number;
  difficulty: 0 | 1 | 2 | 3; // Easy, Medium, Hard, Master
  category: string; //
  answer: string;
};

class Round {
  startTime: number;
  endTime: number;
  callback: Function;
  type: string;
  id: string;
  _endTimeout: NodeJS.Timeout; // Used to force end a timeout

  static currentRound: Round | null = null;

  static endCurrentRound() {
    // * Callback is called before currentRound is set to null
    console.log("Attempting Round Closure");
    if (!Round.currentRound) throw Error("No Round In Session");
    clearTimeout(Round.currentRound._endTimeout); // Force stop timeout
    Round.currentRound?.callback();
    Round.currentRound = null;
  }

  constructor(duration: number, type: string, id: string, callback: Function = () => {}) {
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.callback = callback;
    this.type = type;
    this.id = id;
    this._endTimeout = setTimeout(Round.endCurrentRound, duration);
  }
}

class PuzzleRound extends Round {
  type: "PuzzleRound";

  static _onEnd() {
    console.log("Puzzle Round Ended");
  }

  constructor(duration: number, id: string) {
    super(duration, "PuzzleRound", id, PuzzleRound._onEnd);
    this.type = "PuzzleRound";
    Round.currentRound = this;
  }
}

function startPuzzleRound() {
  try {
    let round = new PuzzleRound(10000, "PuzzleRoundId");
    console.log(Round.currentRound);
  } catch (err) {
    console.log(err);
  }
}

server.listen(Number(config.host_port), function () {
  console.log(server.address());
  console.log("server at http://localhost:%s/", server.address().port);
});

app.post("/login", async (req: express.Request, res: express.Response) => {
  console.log("attempting login");
  const username: string | undefined = req.body.username;
  const password: string | undefined = req.body.password;

  if (!username || !password) {
    res.status(400).send("Missing Username or Password!");
    return;
  }

  let user = await fetchUser(username);
  if (!user) {
    res.status(400).send("Incorrect Credentials!");
    return;
  }

  if (user.password !== password) {
    res.status(400).send("Incorrect Credentials!");
  }

  const id = TokenApi.loginTokenGroup.createNewToken();
  res.cookie("LoginToken", id, { secure: true, maxAge: TokenApi.loginTokenGroup.duration, httpOnly: true }).redirect("home");
});

app.get("/login", (req: express.Request, res: express.Response) => {
  const loginTokenId = req.cookies["LoginToken"];

  if (loginTokenId && TokenApi.loginTokenGroup.findTokenOfId(loginTokenId)) {
    res.redirect("home");
    return;
  }

  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.get("/logout", (req: express.Request, res: express.Response) => {
  const loginTokenId = req.cookies["LoginToken"];
  if (loginTokenId) {
    TokenApi.loginTokenGroup.removeToken(loginTokenId);
    res.clearCookie("LoginToken");
  }

  res.redirect("login");
});

app.get("/home", TokenApi.validateLoginToken, (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});

app.get("/", (req: express.Request, res: express.Response) => {
  res.redirect("login");
});

const puzzleRouter = require("./puzzleRoutes");
app.use("/", puzzleRouter);
