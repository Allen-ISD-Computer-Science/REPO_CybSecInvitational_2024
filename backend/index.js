//@ts-check
require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const { createServer, get } = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

const app = express();
const server = createServer(app);
const io = new Server(server);

//#region MongoDB
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
//#endregion

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const sessionMiddleWare = session({
  //@ts-ignore
  secret:
    process.env.EXPRESS_SESSION_SECRET ||
    generateKey("hmac", { length: 256 }, (err, key) => {
      return key;
    }),
  resave: false, // don't save session if unmodified
  saveUninitialized: false, // don't create session until something stored
});

app.use(sessionMiddleWare);

app.use(express.static(path.join(__dirname, "public")));

// debugging middleware
app.use("*", (req, res, next) => {
  console.log(req.url, req.baseUrl);
  next();
});

//#region JDoc Type Definitions
/**
 * Puzzle Type Definition
 * @typedef {object} Puzzle
 * @prop {string} _id
 * @prop {string} name
 * @prop {string} description
 * @prop {number} point_value
 * @prop {number} difficulty
 * @prop {string} category
 * @prop {string} answer
 */

/**
 * Round Type Definition
 * @typedef {object} Round
 * @prop {number} startTime
 * @prop {number} endTime
 * @prop {function} callback // called during generic end round function
 * @prop {NodeJS.Timeout} endTimeout // uses generic end round function
 * @prop {string} type
 * @prop {string} id
 */

/**
 * Battle Round Type Definition
 * @typedef {object} BattleRoundProperties
 * @prop {number} min_bid
 * @prop {{string?: Puzzle}} puzzles
 * @prop {{string?: number}} users
 * @typedef {Round & BattleRoundProperties} BattleRound
 */

/**
 * Round Start Result Type Definition
 * @typedef {object} RoundStartResult
 * @prop {boolean} success
 * @prop {string?} message
 * @prop {0|1|2|3} status //0: Server side failure, 1: Ok, 2: Round already in session
 */

//#endregion

//event states
var paused = true;
/**@type {Round | BattleRound} */
var currentRound = null;

//#region State Verification
const verifyUser = function (req, res, next) {
  if (!req.session.username) {
    res.redirect("login");
    return;
  }
  next();
};

// Verifies if a battle round currently exists then redirects to battle round page if so
const verifyBattleRound = function (req, res, next) {
  if (currentRound && currentRound.type == "BattleRound") {
    res.redirect("battleRound");
    return;
  }
  next();
};

// Verifies if a puzzle round is currently in session then returns data if not
const testPuzzleRound = function (req, res, next) {
  if (!currentRound || currentRound.type != "PuzzleRound") {
    res.status(403).send("Puzzle Round hasn't started!");
    return;
  }
  next();
};

// Verifies if a battle round is currently in session then returns data if not
const testBattleRound = function (req, res, next) {
  if (!currentRound || currentRound.type != "BattleRound") {
    res.status(403).send("Battle Round hasn't started!");
    return;
  }
  next();
};
//#endregion

//#region Helper Middleware
const asyncHandler = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next)).catch(next);
};
//#endregion

//#region Public
app.get("/public", (req, res) => {
  res.sendFile(path.join(__dirname, "public/public.html"));
});

app.get("/", function (req, res) {
  res.redirect("login");
});
//#endregion

//#region Home
app.get("/home", verifyUser, verifyBattleRound, function (req, res) {
  res.sendFile(path.join(__dirname, "public/home.html"));
});
//#endregion

//#region Registration
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public/register.html"));
});

app.get("/confirm", (req, res) => {
  res.sendFile(path.join(__dirname, "public/confirm.html"));
});

const nodemailer = require("nodemailer");
const e = require("express");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "ahsinvitational@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function genRandPassword() {
  return Math.random().toString(36).slice(-8);
}
function genRandHex(size) {
  return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

async function addUser(participants) {
  console.log(participants);
  try {
    const user = {
      division: 0,
      username: `${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}`,
      password: genRandPassword(),
      completed_puzzles: {},
      members: participants,
      emails: [],
      puzzle_points: 0,
      scenario_points: 0,
    };

    for (let participant of participants) {
      user.emails.push(participant.email);
    }

    let result = await client.db(mainDbName).collection(usersColName).insertOne(user);
    if (result.acknowledged) {
      return user;
    }
    return null;
  } catch (err) {
    console.log(err);
    return null;
  }
}

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

async function sendVerificationEmail(email, code) {
  const message = {
    from: "ahsinvitational@gmail.com",
    to: [email],
    subject: "AHS Cyber Invitational - Email Verification Code",
    text: `An AHS Cyber Invitational account has attempted to be created using this email\nIf you have not attempted to create an AHS Cyber Invitational account using this email, please ignore this message\nYour verification code is: ${code}`,
    html: `
    <h1>AHS Cyber Invitational</h1>
    <p>An AHS Cyber Invitational account has attempted to be created using this email</p>
    <p>If you have not attempted to create an AHS Cyber Invitational account using this email, please ignore this message</p>
    <br />
    <p>Your verification code is: ${code}</p>
    `,
  };

  transporter.sendMail(message, (error, info) => {
    if (error) {
      console.error("Error sending email: ", error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });
}

function sendConfirmationEmail(email, username, password) {
  const message = {
    from: "ahsinvitational@gmail.com",
    to: [email],
    subject: "AHS Cyber Invitational - Account Created",
    text: `An AHS Cyber Invitational account has created under this email\nIf you have not created an AHS Cyber Invitational account using this email, please ignore this message\nUsername: ${username}\nPassword: ${password}`,
    html: `
    <h1>AHS Cyber Invitational</h1>
    <p>An AHS Cyber Invitational account has created under this email</p>
    <p>If you have not created an AHS Cyber Invitational account using this email, please ignore this message</p>
    <br />
    <p>Username: ${username}</p>
    <p>Password: ${password}</p>
    `,
  };

  transporter.sendMail(message, (error, info) => {
    if (error) {
      console.error("Error sending email: ", error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });
}

/**
 * @typedef {object} Registrant
 * @param {string} email
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} school
 * @param {string} gradeLevel
 * @param {string} firstName
 */

class VerificationGroup {
  static pendingGroups = {};

  static attemptVerification(email, code) {
    let group = VerificationGroup.pendingGroups[email];
    if (!group) return false;
    return group.attemptValidation(email, code);
  }

  constructor(registrants) {
    this.tokens = {};
    for (let registrant of registrants) {
      if (!validateEmail(registrant.email)) throw "Invalid Email Format!";
      if (VerificationGroup.pendingGroups[registrant.email]) throw "Email Already Pending Verification!";

      let token = new VerificationToken(registrant);
      if (token) this.tokens[registrant.email] = token;
      sendVerificationEmail(registrant.email, token.code);
      VerificationGroup.pendingGroups[registrant.email] = this;
    }

    this._timeout = setTimeout(() => {
      console.log("session ended");
      this.remove();
    }, 300000);
  }

  remove() {
    clearTimeout(this._timeout);
    for (const key of Object.keys(this.tokens)) {
      delete VerificationGroup.pendingGroups[key];
    }
  }

  async onGroupResolved() {
    console.log("resolved group verification");

    let participants = Object.values(this.tokens).map((value) => {
      delete value.verified;
      delete value.code;
      return value;
    });
    addUser(participants).then((result) => {
      console.log("added user successfully!", result);
      if (!result || !result.members) return;
      for (let member of result.members) {
        sendConfirmationEmail(member.email, result.username, result.password);
      }
    });

    this.remove();
    console.log(VerificationGroup.pendingGroups);
  }

  attemptValidation(email, code) {
    let token = this.tokens[email];
    if (!token) return false;
    if (token.code !== code) return false;
    token.verified = true;

    let resolved = true;
    for (const [key, token] of Object.entries(this.tokens)) {
      if (!token.verified) {
        resolved = false;
        break;
      }
    }
    if (resolved) {
      this.onGroupResolved();
    }
    return true;
  }
}

class VerificationToken {
  constructor(registrant) {
    this.email = registrant.email;
    this.firstName = registrant.firstName;
    this.lastName = registrant.lastName;
    this.school = registrant.school;
    this.gradeLevel = registrant.gradeLevel;
    this.shirtSize = registrant.shirtSize;
    this.code = Math.floor(100000 + Math.random() * 900000);
    this.verified = false;
  }
}

app.post("/registerVerify", (req, res) => {
  const email = String(req.body.email);
  const code = Number(req.body.code);

  if (!email || !code) {
    res.sendStatus(400);
    return;
  }

  const result = VerificationGroup.attemptVerification(email, code);
  if (result) {
    res.sendStatus(200);
    return;
  } else {
    res.sendStatus(404);
    return;
  }
});

app.post("/register", async (req, res) => {
  /**@type {Registrant[]} */
  let registrants = [];
  const registrantsBody = req.body.registrants;
  try {
    if (registrantsBody.length > 2) {
      //limit group size
      res.sendStatus(400);
      return;
    }

    for (let registrant of registrantsBody) {
      console.log(registrant);

      const email = String(registrant.email);
      const firstName = String(registrant.firstName);
      const lastName = String(registrant.lastName);
      const school = String(registrant.school);
      const gradeLevel = String(registrant.gradeLevel);
      const shirtSize = String(registrant.shirtSize);
      if (!email || !firstName || !lastName || !school || !gradeLevel || !shirtSize) {
        res.status(400).send("Missing Parameters!");
        return;
      }

      if (!validateEmail(email)) {
        res.status(400).send("Invalid Email Format!");
        return;
      }

      registrants.push({
        email: email,
        firstName: firstName,
        lastName: lastName,
        school: school,
        gradeLevel: gradeLevel,
        shirtSize: shirtSize,
      });
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
    return;
  }

  let emails = registrants.map((registrant) => {
    return { emails: registrant.email };
  });

  try {
    let result = await client.db(mainDbName).collection(usersColName).findOne({ $or: emails });
    if (result) {
      res.status(400).send("Account with Email already exists!");
      return;
    }
  } catch (err) {
    res.status(500).send("Server Side Error!");
    return;
  }

  try {
    await new VerificationGroup(registrants);
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
    return;
  } finally {
    res.sendStatus(200);
  }
});
//#endregion

//#region Login
async function fetchUser(username) {
  try {
    const result = await client.db(mainDbName).collection(usersColName).findOne({ username: username });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchUsers(query = {}, sort = {}, projection = {}, count = 1, skip = 0) {
  try {
    const cursor = await client.db(mainDbName).collection(usersColName).find(query).project(projection).skip(skip).sort(sort).limit(count);
    return cursor.toArray();
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchAllUsers() {
  try {
    const cursor = await client.db(mainDbName).collection(usersColName).find();
    return cursor.toArray();
  } catch (err) {
    console.log(err);
    return null;
  }
}

app.get("/login", function (req, res) {
  //@ts-ignore
  if (req.session.username) {
    res.redirect("home");
  }
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/logout", verifyUser, function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect("login");
});

app.post("/login", async (req, res) => {
  console.log("attempting login ");

  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.sendStatus(400);
    return;
  }

  var user = await fetchUser(username);
  if (!user) {
    res.sendStatus(404);
    return;
  }

  if (user.password === password) {
    //@ts-ignore
    req.session.username = user.username;
    res.sendStatus(200);
    return;
  } else {
    console.log("invalid login credentials");
    res.sendStatus(401);
    return;
  }
});
//#endregion

//#region Users
app.post("/getUser", verifyUser, async (req, res) => {
  //@ts-ignore
  const username = req.session.username;
  var user = await fetchUser(username);
  if (!user) {
    res.sendStatus(404);
    return;
  }

  delete user.password;
  delete user._id;
  res.json(user);
});

app.post("/getUsers", verifyUser, async (req, res) => {
  const dbquery = req.body.query;
  const sort = req.body.sort;
  const projection = req.body.projection;
  const count = req.body.count;
  const skip = req.body.skip;

  const users = await fetchUsers(dbquery, sort, projection, count, skip);
  if (!users) {
    res.sendStatus(500);
    return;
  }

  users.forEach((user) => {
    delete user._id;
    delete user.password;
    delete user.completed_puzzles;
  });
  res.json(users);
});
//#endregion

//#region Rounds
async function endCurrentRound() {
  console.log("Ending current round");
  if (!currentRound) return;

  try {
    clearTimeout(currentRound.endTimeout);
  } catch (err) {
    console.log(err);
  }

  console.log(currentRound);

  currentRound.callback();
  currentRound = null;

  console.log(currentRound);
}

//#region Puzzle Round
function endPuzzleRound() {
  console.log("Ending puzzle round");
  io.emit("round_end", { type: "PuzzleRound" });
}

/**
 * @param {string} id
 * @param {number} duration
 * @returns {RoundStartResult}
 */
function startPuzzleRound(id, duration = config.puzzle_round_duration) {
  if (currentRound !== null) {
    console.warn("A round is already in session");
    return { success: false, status: 2, message: "Round already in session!" };
  }

  console.log(`starting puzzle round, duration ${duration}`);

  let time = Date.now();
  /**@type {Round} */
  let puzzleRound = {
    startTime: time,
    endTime: time + duration,
    callback: endPuzzleRound,
    endTimeout: setTimeout(endCurrentRound, Number(duration)),
    type: "PuzzleRound",
    id: id,
  };
  currentRound = puzzleRound;

  io.emit("round_start", { type: "PuzzleRound", endTime: currentRound.endTime });
  return { success: true, status: 1 };
}
//#endregion
//#endregion

//#region Puzzles

var puzzles = {};

// simplified version of puzzles (excludes answers, and descriptions)
var puzzlesList = [];

function fetchPuzzle(name) {
  return puzzles[name];
}

async function replicatePuzzles() {
  //fetch all puzzles that currently exist
  try {
    const result = await client
      .db(mainDbName)
      .collection(puzzlesColName)
      .find({}, { projection: { _id: 0 } })
      .toArray();

    if (!result) throw "Failed to replicate puzzles";

    let repVal = {};
    result.forEach((puzzle) => {
      repVal[puzzle.name] = puzzle;
      let clone = { ...puzzle };
      delete clone.answer;
      delete clone.description;

      puzzlesList.push(clone);
    });
    puzzles = repVal;
  } catch (err) {
    console.log(err);
    return;
  }
}
replicatePuzzles();

async function fetchPuzzleDetail(name) {
  return puzzles[name];
}

async function isPuzzleAnswerCorrect(name, answer) {
  try {
    const result = await client
      .db(mainDbName)
      .collection(puzzlesColName)
      .findOne({ name: name }, { projection: { answer: 1 } });

    if (!result) throw "Failed to fetch puzzle!";
    return result.answer === answer;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function onPuzzleCorrect(username, amount, id) {
  console.log(username, amount, id);
  try {
    const result = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username }, { $inc: { puzzle_points: amount }, $set: { [`completed_puzzles.${id}`]: true } });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

app.get("/puzzles", verifyUser, verifyBattleRound, function (req, res) {
  if (!currentRound || currentRound.type != "PuzzleRound") {
    res.redirect("home");
  } else {
    res.sendFile(path.join(__dirname, "public/puzzles.html"));
  }
});

app.post("/getPuzzle", verifyUser, testPuzzleRound, async (req, res) => {
  const id = req.body.id;
  if (!id) {
    // Bad request
    res.status(400).send("Missing puzzle id!");
    return;
  }

  const puzzle = await fetchPuzzleDetail(id);
  if (!puzzle) {
    res.status(404).send("Puzzle not found!");
    return;
  } else {
    res.json(puzzle);
    return;
  }
});

app.post("/getAllPuzzles", verifyUser, testPuzzleRound, async (req, res) => {
  res.json(puzzlesList);
});

app.post("/submitPuzzle", verifyUser, testPuzzleRound, async (req, res) => {
  //@ts-ignore
  const username = req.session.username;
  const id = req.body.id;
  const answer = req.body.answer;

  if (!id || !answer || !username) {
    res.status(400).send("Missing parameters!");
    return;
  }

  const userData = await fetchUser(username);
  if (!userData) {
    res.status(400).send("User not found!");
    return;
  }

  const puzzle = fetchPuzzle(id);
  if (!puzzle) {
    res.status(404).send("Puzzle not found!");
  }

  if (await isPuzzleAnswerCorrect(id, answer)) {
    onPuzzleCorrect(username, puzzle.point_value, puzzle.name);
    res.json({ correct: true });
    return;
  } else {
    res.json({ correct: false });
    return;
  }
});
//#endregion

//#region Battle Round
async function onBattleRoundCredit(username, amount) {
  try {
    const result = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: username }, { $inc: { puzzle_points: amount } });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

function lerp(a, b, alpha) {
  return a + alpha * (b - a);
}

app.get("/battleRound", verifyUser, function (req, res) {
  if (!currentRound || currentRound.type != "BattleRound") {
    res.redirect("home");
  } else {
    res.sendFile(path.join(__dirname, "public/battleRound.html"));
  }
});

async function endBattleRound() {
  let round = currentRound;

  if (round.type != "BattleRound") return;

  let usersList = {};
  try {
    const users = await fetchAllUsers();
    if (!users) {
      console.warn("Failed to fetch users");
      return;
    }
    users.forEach((user) => {
      usersList[user.username] = user;
    });
  } catch (err) {
    console.log(err);
  }

  // reward points to participants
  if (Object.keys(round.users).length <= 0) {
    console.warn("No users in battle round");
  } else {
    let participants = Object.values(round.users);

    participants.forEach((participant, i) => {
      const user = participant.user;
      const username = user.username;
      const k = Object.values(participant.completed).length / 4;
      const multiplier = lerp(config.battle_round_min_multiplier, config.battle_round_max_multiplier, k);
      const prize = Math.floor(multiplier * participant.bid);
      onBattleRoundCredit(username, prize);
      delete usersList[username];
    });
  }

  // deduct points from non participants
  Object.values(usersList).forEach(async (user) => {
    try {
      await client
        .db(mainDbName)
        .collection(usersColName)
        .updateOne({ username: user.username }, { $inc: { puzzle_points: -Math.floor(Math.max(user.puzzle_points * round.min_bid, 0)) } });
    } catch (err) {
      console.log(err);
      return;
    }
    ``;
  });

  io.emit("round_end", { type: "BattleRound" });
}

/**
 * @param {string} id
 * @param {number} duration
 * @returns {Promise<RoundStartResult>}
 */
async function startBattleRound(id, duration = config.battle_round_duration) {
  if (currentRound) {
    return { success: false, status: 2, message: "Round already in session!" };
  }

  const battleRoundConfig = config.battle_rounds[id];
  if (!battleRoundConfig) {
    console.warn("Battle round of id " + id + " not found");
    return { success: false, status: 0, message: "BattleRound if id not found!" };
  }
  const battleRoundPuzzleIds = battleRoundConfig.puzzles;
  if (!battleRoundPuzzleIds) {
    console.warn("Battle round of missing puzzles");
    return { success: false, status: 0, message: "BattleRound missing Puzzles!" };
  }

  /**@type {{string?: Puzzle}} */
  let puzzles = {};
  for (let puzzleId of battleRoundPuzzleIds) {
    try {
      /**@type {Puzzle} */
      //@ts-ignore
      let result = await client.db(mainDbName).collection(battleRoundPuzzlesColName).findOne({ name: puzzleId });
      if (!result) {
        console.warn("Failed to fetch puzzle of id " + puzzleId);
        return { success: false, status: 0, message: "Failed to fetch BattleRound Puzzles!" };
      } else {
        //@ts-ignore
        delete result._id;
        puzzles[result.name] = result;
      }
    } catch (err) {
      console.log(err);
      return { success: false, status: 0 };
    }
  }

  let time = Date.now();
  /**@type {BattleRound} */
  let battleRound = {
    startTime: time,
    endTime: time + duration,
    callback: endBattleRound,
    endTimeout: setTimeout(endCurrentRound, duration),
    type: "BattleRound",
    id: id,
    min_bid: battleRoundConfig.min_bid,
    puzzles: puzzles,
    users: {},
  };
  currentRound = battleRound;

  io.emit("round_start", { type: "BattleRound", endTime: currentRound.endTime });
  return { success: true, status: 1 };
}

app.post("/battleRound/getStatus", verifyUser, testBattleRound, async (req, res) => {
  //@ts-ignore
  if (currentRound.users[req.session.username]) {
    res.json({ alreadyJoined: true, endTime: currentRound.endTime });
    return;
  }

  res.json({ alreadyJoined: false, endTime: currentRound.endTime });
});

app.post("/battleRound/join", verifyUser, testBattleRound, async (req, res) => {
  const bidPercentage = req.body.bid;
  if (!bidPercentage && bidPercentage !== 0) {
    res.sendStatus(400);
    return;
  }

  if (currentRound.users[req.session.username]) {
    res.json({ success: false, alreadyJoined: true });
    return;
  }

  const user = await fetchUser(req.session.username);
  if (!user) {
    res.sendStatus(404);
    return;
  }

  //@ts-ignore
  delete user._id;
  delete user.password;
  delete user.completed_puzzles;
  if (!user) {
    res.sendStatus(403);
    return;
  }

  const bid = Math.max(Math.min(Math.floor(user.puzzle_points * bidPercentage), user.puzzle_points), 0);

  try {
    const result = await client
      .db(mainDbName)
      .collection(usersColName)
      .updateOne({ username: req.session.username }, { $set: { puzzle_points: user.puzzle_points - bid } });
    if (result) user.puzzle_points -= bid;
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
    return;
  }

  currentRound.users[req.session.username] = {
    user: user,
    bid: bid,
    completed: {},
  };
  res.json({ success: true });
});

app.post("/battleRound/getPuzzles", verifyUser, testBattleRound, async (req, res) => {
  const participant = currentRound.users[req.session.username];
  if (!participant) {
    res.sendStatus(403);
    return;
  }

  const puzzles = Object.values(currentRound.puzzles);
  const package = [];
  for (let puzzle of puzzles) {
    let clone = { ...puzzle };
    if (participant.completed[puzzle.name]) {
      clone.completed = true;
    }
    delete clone.answer;
    package.push(clone);
  }
  res.json(package);
});

app.post("/battleRound/getPuzzle", verifyUser, testBattleRound, async (req, res) => {
  const participant = currentRound.users[req.session.username];
  if (!participant) {
    res.sendStatus(403);
    return;
  }

  const id = req.body.id;
  if (!id) {
    res.sendStatus(402);
    return;
  }

  const puzzle = currentRound.puzzles[id];
  if (!puzzle) {
    res.sendStatus(404);
  }

  let package = { ...puzzle };
  delete package.answer;
  res.json(package);
});

app.post("/battleRound/submitPuzzle", verifyUser, testBattleRound, async (req, res) => {
  const participant = currentRound.users[req.session.username];
  if (!participant) {
    res.sendStatus(403);
    return;
  }

  const puzzleid = req.body.id;
  const answer = req.body.answer;
  if (!puzzleid || !answer) {
    res.send(400);
    return;
  }

  const puzzle = currentRound.puzzles[puzzleid];
  if (!puzzle) {
    res.sendStatus(400);
    return;
  }

  if (participant.completed[puzzle.name]) {
    res.json({ alreadyCompleted: true });
    return;
  }

  if (puzzle.answer === answer) {
    participant.completed[puzzle.name] = true;
    res.json({ correct: true });
    return;
  } else {
    res.json({ correct: false });
    return;
  }
});
//#endregion

// #region Scoreboard
async function getScoreboard() {
  try {
    const result = await client.db(mainDbName).collection(usersColName).find({}).project({ _id: 0, password: 0, completed_puzzles: 0 });
    return result.toArray();
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function updateEvent() {
  if (paused) return;
  console.log("updating scoreboard");
  let scoreboardData = await getScoreboard();

  let currentRoundData = { ...currentRound };
  delete currentRoundData.endTimeout;

  let package = {
    scoreboard: scoreboardData,
    currentRound: currentRoundData,
  };

  io.emit("update_event", package);
  setTimeout(updateEvent, config.internal_tick_rate); // in milliseconds
}

function pauseUpdates() {
  if (paused) return;
  paused = true;
}

function startUpdates() {
  if (!paused) return;
  paused = false;
  updateEvent();
}

app.get("/scoreboard", verifyUser, verifyBattleRound, function (req, res) {
  res.sendFile(path.join(__dirname, "public/scoreboard.html"));
});

app.post("/getScoreboard", async (req, res) => {
  const scoreboard = await getScoreboard();
  res.json(scoreboard);
});
//#endregion

//#region Admin
const adminCheck = function (req, res, next) {
  const isAdmin = req.session.isAdmin;
  if (isAdmin !== true) {
    res.sendStatus(403);
    return;
  }
  console.log("id admin!");
  next();
};

app.post("/adminLogin", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  console.log(username, password);

  if (!username || !password) {
    res.sendStatus(400);
    return;
  }

  try {
    let result = await client.db(mainDbName).collection(adminColName).findOne({ username: username });
    if (result && result.password == password) {
      req.session.isAdmin = true; // potentially insecure
      res.sendStatus(200);
      return;
    } else {
      res.sendStatus(403);
      return;
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
    return;
  }
});

app.get("/adminLogin", (req, res) => {
  //@ts-ignore
  if (req.session.isAdmin === true) {
    res.sendFile(path.join(__dirname, "public/admin.html"));
  } else {
    res.sendFile(path.join(__dirname, "public/adminLogin.html"));
  }
});

app.get("/admin", adminCheck, (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.post("/admin/command", adminCheck, async (req, res) => {
  const operation = req.body.operation;
  const operand = req.body.operand;
  //amount of points added
  const arguments = req.body.arguments;
  //id of completed puzzle

  // return;

  switch (operation) {
    case "ADD": // increment points by certain amount, add puzzle to completed
      switch (operand) {
        case "PUZZLE_POINTS":
          if (!arguments.target || !arguments.amount) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $inc: { puzzle_points: arguments.amount } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        case "SCENARIO_POINTS":
          if (!arguments.target || !arguments.amount) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $inc: { scenario_points: arguments.amount } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        case "COMPLETED_PUZZLE":
          if (!arguments.target || !arguments.id) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .updateOne({ username: arguments.target }, { $set: { [`completed_puzzles.${arguments.id}`]: true } });

            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        default:
          res.status(400).send("Invalid Operand!");
          return;
      }

    case "SUB": //decrement points by certain amount, remove puzzle from completed
      switch (operand) {
        case "PUZZLE_POINTS":
          if (!arguments.target || !arguments.amount) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $inc: { puzzle_points: -arguments.amount } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        case "SCENARIO_POINTS":
          if (!arguments.target || !arguments.amount) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $inc: { scenario_points: -arguments.amount } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        case "COMPLETED_PUZZLE":
          if (!arguments.target || !arguments.id) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .updateOne({ username: arguments.target }, { $unset: { [`completed_puzzles.${arguments.id}`]: "" } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        default:
          res.status(400).send("Invalid Operand!");
          return;
      }

    case "SET": //set points values, set division,
      switch (operand) {
        case "PUZZLE_POINTS":
          if (!arguments.target || !arguments.amount) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $set: { puzzle_points: arguments.amount } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        case "SCENARIO_POINTS":
          if (!arguments.target || !arguments.amount) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $set: { scenario_points: arguments.amount } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }

        case "DIVISION":
          if (!arguments.target || !arguments.division) {
            res.status(400).send("Operation missing arguments");
            return;
          }

          arguments.division = Number(arguments.division);
          console.log(typeof arguments.division, arguments.division);

          if (arguments.division !== 0 && arguments.division !== 1 && arguments.division !== 2) {
            res.status(400).send("Division is not a Number!");
            return;
          }

          try {
            let result = await client
              .db(mainDbName)
              .collection(usersColName)
              .findOneAndUpdate({ username: arguments.target }, { $set: { division: arguments.division } });
            if (result) {
              res.status(200).send("Success");
              return;
            } else {
              res.status(404).send("Failed to fetch User");
              return;
            }
          } catch (err) {
            console.log(err);
            res.status(500).send("Server Failed to execute operation");
            return;
          }
        default:
          res.status(400).send("Invalid Operand!");
          return;
      }

    case "START": //starts events (puzzle round, )
      switch (operand) {
        case "BATTLE_ROUND":
          const battleRoundId = arguments.id;

          if (!battleRoundId) {
            res.status(400).send("Missing Round Id!");
            return;
          }

          let battleRoundDuration = null;
          if (arguments.duration) {
            const durationNum = Number(arguments.duration);
            if (!durationNum) {
              res.status(400).send("Duration value is not a Number!");
              return;
            } else {
              battleRoundDuration = durationNum;
            }
          }

          let battleRoundStartResult = null;
          if (battleRoundDuration) {
            battleRoundStartResult = await startBattleRound(battleRoundId, battleRoundDuration);
          } else {
            battleRoundStartResult = await startBattleRound(battleRoundId);
          }

          if (battleRoundStartResult.status == 0 || battleRoundStartResult.status == 2) {
            res.status(400).send(battleRoundStartResult.message);
          } else if (battleRoundStartResult.status == 1) {
            res.sendStatus(200);
          }
          return;
        case "PUZZLE_ROUND":
          const puzzleRoundId = arguments.id;

          if (!puzzleRoundId) {
            res.status(400).send("Missing Round Id!");
            return;
          }

          let puzzleRoundDuration = null;
          if (arguments.duration) {
            const durationNum = Number(arguments.duration);
            if (!durationNum) {
              res.status(400).send("Duration value is not a Number!");
              return;
            } else {
              puzzleRoundDuration = durationNum;
            }
          }

          let puzzleRoundStartResult = null;
          if (puzzleRoundDuration) {
            puzzleRoundStartResult = await startPuzzleRound(puzzleRoundId, puzzleRoundDuration);
          } else {
            puzzleRoundStartResult = await startPuzzleRound(puzzleRoundId);
          }

          if (puzzleRoundStartResult.status == 0 || puzzleRoundStartResult.status == 2) {
            res.status(400).send(puzzleRoundStartResult.message);
          } else if (puzzleRoundStartResult.status == 1) {
            res.sendStatus(200);
          }
          return;
        case "SCENARIO_ROUND":
          return;
        default:
          res.status(400).send("Invalid Operand!");
          return;
      }

    case "END": //ends events (puzzle round, battle round)
      switch (operand) {
        case "PUZZLE_ROUND":
          if (currentRound?.type != "PuzzleRound") {
            res.status(400).send("Current Round is not a Puzzle Round!");
            return;
          }
          try {
            endCurrentRound();
            res.sendStatus(200);
          } catch (err) {
            console.log(err);
            res.status(500).send("Internal Server Error!");
          }
          return;
        case "BATTLE_ROUND":
          if (currentRound?.type != "BattleRound") {
            res.status(400).send("Current Round is not a Battle Round!");
            return;
          }
          try {
            endCurrentRound();
            res.sendStatus(200);
          } catch (err) {
            console.log(err);
            res.status(500).send("Internal Server Error!");
          }
          return;
        case "SCENARIO_ROUND":
          if (currentRound?.type != "ScenarioRound") {
            res.status(400).send("Current Round is not a Scenario Round!");
            return;
          }
          try {
            endCurrentRound();
            res.sendStatus(200);
          } catch (err) {
            console.log(err);
            res.status(500).send("Internal Server Error!");
          }
          return;
        case "ROUND":
          try {
            endCurrentRound();
            res.sendStatus(200);
          } catch (err) {
            console.log(err);
            res.status(500).send("Internal Server Error!");
          }
          return;
        default:
          res.status(400).send("Invalid Operand!");
          return;
      }

    case "ALERT":
      let message = arguments.message;
      if (!message) {
        res.status(400).send("Missing Arguments!");
        return;
      }

      switch (operand) {
        case "MESSAGE":
          io.emit("alert", { level: 0, message: message });
          res.sendStatus(200);
          break;
        case "WARNING":
          io.emit("alert", { level: 1, message: message });
          res.sendStatus(200);
          break;
        case "DANGER":
          io.emit("alert", { level: 2, message: message });
          res.sendStatus(200);
          break;
        default:
          res.status(400).send("Invalid Operand!");
          break;
      }
      break;

    default:
      res.status(400).send("Invalid Operation!");
      return;
  }
});
//#endregion

//#region Scenario

startUpdates();

function uuidv4() {
  return crypto.randomUUID();
}

class ScenarioToken {
  static tokens = {};
  static userReference = {};

  static _checkConcurrence(username) {
    for (let token of Object.values(ScenarioToken.tokens)) {
      if (username == token.user?.username) return token;
    }
    return false;
  }

  static fetchToken(id) {
    return ScenarioToken.tokens[id];
  }

  static async createNewToken(username, password) {
    const user = await fetchUser(username);
    if (!user || user?.password !== password) {
      return { ok: false, message: "Missing arguments" };
    } else {
      let currentToken = ScenarioToken._checkConcurrence(user.username);
      if (currentToken) {
        console.log("fetched existing token");
        return { ok: true, token: currentToken };
      } else {
        console.log("created new token");
        return { ok: true, token: new ScenarioToken(user) };
      }
    }
  }

  constructor(user) {
    this.user = user;
    this.id = uuidv4();
    ScenarioToken.tokens[this.id] = this;
    this._timeout = setTimeout(() => {
      delete ScenarioToken.tokens[this.id];
    }, 10000);
  }
}

io.engine.use(sessionMiddleWare);
io.on("connection", (socket) => {
  //join unique room
  socket.join(socket.id);

  socket.on("disconnect", () => {
    console.log("Client Disconnected");
  });

  socket.on("scenario_login", async (data) => {
    console.log("attempting login");

    if (!data || !data.username || !data.password) {
      io.to(socket.id).emit("scenario_on_login", { ok: false, status: 400, message: "Missing Arguments" });
      return;
    }

    let result = await ScenarioToken.createNewToken(data.username, data.password);

    if (result.ok) {
      io.to(socket.id).emit("scenario_on_login", {
        ok: true,
        status: 200,
        message: "Logged In",
        tokenId: result.token.id,
        expirationTime: Date.now() + config.scenario_token_duration,
      });
      return;
    } else {
      io.to(socket.id).emit("scenario_on_login", { ok: false, status: 403, message: result.message });
      return;
    }
  });

  console.log("Client Connected");
});

//#endregion

server.listen(Number(config.host_port), function () {
  //@ts-ignore
  var host = server.address().address;
  //@ts-ignore
  var port = server.address().port;

  console.log(server.address());

  console.log("server at http://localhost:%s/home", port);
});
