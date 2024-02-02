//@ts-check
require("dotenv").config();

const express = require("express");
const { createServer, get } = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const config = require(path.join(__dirname, "config.json"));

const app = express();
const server = createServer(app);
const io = new Server(server);

//MongoDB
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
const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

process.on("SIGINT", () => {
  client.close().then(() => {
    console.info("Mongoose primary connection disconnected through app termination!");
    process.exit(0);
  });
});

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  session({
    //@ts-ignore
    secret:
      process.env.EXPRESS_SESSION_SECRET ||
      generateKey("hmac", { length: 256 }, (err, key) => {
        return key;
      }),
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);

app.use(express.static(path.join(__dirname, "public")));

//database functions
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

async function fetchPuzzle(name) {
  try {
    const result = await client.db(mainDbName).collection(puzzlesColName).findOne({ name: name });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchPuzzles(query = {}, sort = {}, projection = {}, count = 1, skip = 0) {
  try {
    const cursor = await client.db(mainDbName).collection(puzzlesColName).find(query).project(projection).skip(skip).sort(sort).limit(count);
    return cursor;
  } catch (err) {
    console.log(err);
    return null;
  }
}

function genRandPassword() {
  return Math.random().toString(36).slice(-8);
}
function genRandHex(size) {
  return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

async function addUser(email1, shirt1, email2, shirt2) {
  try {
    const user = {
      division: 0,
      username: `${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}`,
      password: genRandPassword(),
      completed_puzzles: {},
      emails: [email1, email2],
      shirtSizes: [shirt1, shirt2],
      puzzle_points: 0,
      scenario_points: 0,
    };
    return await client.db(mainDbName).collection(usersColName).insertOne(user);
  } catch (err) {
    console.log(err);
    return null;
  }
}

const verifyUser = function (req, res, next) {
  if (!req.session.username) {
    res.redirect("login");
    return;
  }
  next();
};

const testBattleRound = function (req, res, next) {
  if (currentBattleRound) {
    res.redirect("battleRound");
    return;
  }
  next();
};

// debugging middleware
app.use("*", (req, res, next) => {
  console.log(req.url, req.baseUrl);
  next();
});

//async handling
const asyncHandler = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next)).catch(next);
};

//routing
app.get("/public", (req, res) => {
  res.sendFile(path.join(__dirname, "public/public.html"));
});

app.get("/", function (req, res) {
  res.redirect("login");
});

app.get("/home", verifyUser, testBattleRound, function (req, res) {
  res.sendFile(path.join(__dirname, "public/home.html"));
});

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

app.get("/scoreboard", verifyUser, testBattleRound, function (req, res) {
  res.sendFile(path.join(__dirname, "public/scoreboard.html"));
});

app.get("/battleRound", verifyUser, function (req, res) {
  res.sendFile(path.join(__dirname, "public/battleRound.html"));
});

//actions

//register
app.post(
  "/register",
  asyncHandler(async (req, res) => {})
);

//#region Login
app.post(
  "/login",
  asyncHandler(async (req, res) => {
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
      req.session.username = user.username;
      res.sendStatus(200);
      return;
    } else {
      console.log("invalid login credentials");
      res.sendStatus(401);
      return;
    }
  })
);
//#endregion

//#region Puzzles
app.get("/puzzles", verifyUser, testBattleRound, function (req, res) {
  res.sendFile(path.join(__dirname, "public/puzzles.html"));
});

app.post(
  "/getPuzzle",
  verifyUser,
  asyncHandler(async (req, res) => {
    const id = req.body.id;
    if (!id) {
      // Bad request
      res.sendStatus(400);
      return;
    }

    const puzzle = await fetchPuzzle(id);
    if (!puzzle) {
      res.sendStatus(404);
      return;
    } else {
      delete puzzle._id;
      delete puzzle.answer;
      res.json(puzzle);
      return;
    }
  })
);

app.post(
  "/getMultiplePuzzles",
  verifyUser,
  asyncHandler(async (req, res) => {
    console.log("attempting to fetch puzzles");

    const dbquery = req.body.query;
    const sort = req.body.sort;
    const projection = req.body.projection;
    const count = req.body.count;
    const skip = req.body.skip;

    const cursor = await fetchPuzzles(Object(dbquery), Object(sort), Object({ ...projection, answer: 0, _id: 0, description: 0 }), Number(count), Number(skip));
    if (!cursor) {
      res.sendStatus(404);
      return;
    }
    const puzzles = await cursor.toArray();

    if (puzzles) {
      res.json(puzzles);
      return;
    } else {
      res.sendStatus(404);
      return;
    }
  })
);

app.post(
  "/submitPuzzle",
  verifyUser,
  asyncHandler(async (req, res) => {
    const username = req.session.username;
    const id = req.body.id;
    const answer = req.body.answer;

    if (!id || !answer || !username) {
      res.sendStatus(400);
      return;
    }

    const userData = await fetchUser(username);
    if (!userData) {
      res.sendStatus(400);
      return;
    }

    const puzzle = await fetchPuzzle(id);
    if (!puzzle) {
      res.sendStatus(404);
      return;
    }

    if (!puzzle.answer) {
      console.log("puzzle is missing answer");
      res.sendStatus(500);
      return;
    }

    if (userData.completed_puzzles[puzzle.name]) {
      res.json({ alreadyCompleted: true });
      return;
    } else {
      if (puzzle.answer === answer) {
        const result = onPuzzleCorrect(username, puzzle.point_value, puzzle.name);
        if (!result) {
          res.sendStatus(500);
          return;
        }
        res.json({ correct: true });
        return;
      } else {
        res.json({ correct: false });
        return;
      }
    }
  })
);
//#endregion

//#region Users
app.post(
  "/getUser",
  verifyUser,
  asyncHandler(async (req, res) => {
    const username = req.session.username;
    var user = await fetchUser(username);
    if (!user) {
      res.sendStatus(404);
      return;
    }

    delete user.password;
    delete user._id;
    res.json(user);
  })
);

app.post(
  "/getUsers",
  verifyUser,
  asyncHandler(async (req, res) => {
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
  })
);
//#endregion

//game state
var paused = true;
var currentBattleRound = null;

//battle round
function lerp(a, b, alpha) {
  return a + alpha * (b - a);
}

async function endBattleRound() {
  if (!currentBattleRound) {
    console.log("No Current Battle Round");
    return false;
  } else {
    console.log("Ending Battle Round");
  }

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

  if (Object.keys(currentBattleRound.users).length <= 0) {
    console.warn("No users in battle round");
  } else {
    let participants = Object.values(currentBattleRound.users);

    participants.forEach((participant, i) => {
      const user = participant.user;
      const username = user.username;
      const k = Object.values(participant.completed).length / 4;
      const multiplier = lerp(config.battle_round_min_multiplier, config.battle_round_max_multiplier, k);
      const prize = Math.min(multiplier * participant.bid);
      console.log(prize);
      onBattleRoundCredit(username, prize);
      delete usersList[username];
    });
  }

  console.log(usersList);
  Object.values(usersList).forEach(async (user) => {
    try {
      await client
        .db(mainDbName)
        .collection(usersColName)
        .updateOne({ username: user.username }, { $set: { puzzle_points: user.puzzle_points - Math.floor(Math.max(user.puzzle_points * currentBattleRound.min_bid, 0)) } });
    } catch (err) {
      console.log(err);
      return false;
    }
  });

  io.emit("battle_round_end");
  currentBattleRound = null;
  return true;
}

async function startBattleRound(battleRoundId, duration = config.battle_round_duration) {
  const battleRound = config.battle_rounds[battleRoundId];
  if (!battleRound) {
    console.warn("Battle round of id " + battleRoundId + " not found");
    return { success: false };
  }
  const battleRoundPuzzleIds = battleRound["puzzles"];
  if (!battleRoundPuzzleIds) {
    console.warn("Battle round of missing puzzles");
    return { success: false };
  }

  let puzzles = {};
  for (let puzzleId of battleRoundPuzzleIds) {
    var result = null;
    try {
      result = await client.db(mainDbName).collection(battleRoundPuzzlesColName).findOne({ name: puzzleId });
    } catch (err) {
      console.log(err);
      return { success: false };
    }

    if (!result) {
      console.warn("Failed to fetch puzzle of id " + puzzleId);
      return { success: false };
    } else {
      //@ts-ignore
      delete result._id;
      puzzles[result.name] = result;
      // puzzles.push(result);
    }
  }

  let now = Date.now();
  currentBattleRound = {
    id: battleRoundId,
    min_bid: battleRound.min_bid,
    puzzles: puzzles,
    startTime: now,
    endTime: now + config.battle_round_duration,
    users: {},
  };

  io.emit("battle_round_start");

  setTimeout(async () => {
    endBattleRound();
  }, config.battle_round_duration);

  return { success: true };
}

app.post(
  "/battleRound/getStatus",
  asyncHandler(async (req, res) => {
    if (!req.session.username) {
      res.sendStatus(403);
      return;
    }

    if (!currentBattleRound) {
      res.json({ notStarted: true });
      return;
    }

    if (currentBattleRound.users[req.session.username]) {
      res.json({ alreadyJoined: true, endTime: currentBattleRound.endTime });
      return;
    }

    res.json({ alreadyJoined: false, endTime: currentBattleRound.endTime });
  })
);

app.post(
  "/battleRound/join",
  asyncHandler(async (req, res) => {
    if (!req.session.username) {
      res.sendStatus(403);
      return;
    }

    const bidPercentage = req.body.bid;
    if (!bidPercentage && bidPercentage !== 0) {
      res.sendStatus(400);
      return;
    }

    if (!currentBattleRound) {
      res.json({ success: false, notStarted: true });
      return;
    }

    if (currentBattleRound.users[req.session.username]) {
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

    currentBattleRound.users[req.session.username] = {
      user: user,
      bid: bid,
      completed: {},
    };
    res.json({ success: true });
  })
);

app.post(
  "/battleRound/getPuzzles",
  asyncHandler(async (req, res) => {
    if (!req.session.username) {
      res.sendStatus(403);
      return;
    }

    if (!currentBattleRound) {
      res.json({ notStarted: true });
      return;
    }

    const participant = currentBattleRound.users[req.session.username];
    if (!participant) {
      res.sendStatus(403);
      return;
    }

    const puzzles = Object.values(currentBattleRound.puzzles);
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
  })
);

app.post(
  "/battleRound/getPuzzle",
  asyncHandler(async (req, res) => {
    if (!req.session.username) {
      res.sendStatus(403);
      return;
    }

    if (!currentBattleRound) {
      res.json({ notStarted: true });
      return;
    }

    const participant = currentBattleRound.users[req.session.username];
    if (!participant) {
      res.sendStatus(403);
      return;
    }

    const id = req.body.id;
    if (!id) {
      res.sendStatus(402);
      return;
    }

    const puzzle = currentBattleRound.puzzles[id];
    if (!puzzle) {
      res.sendStatus(404);
    }

    let package = { ...puzzle };
    delete package.answer;
    res.json(package);
  })
);

app.post(
  "/battleRound/submitPuzzle",
  asyncHandler(async (req, res) => {
    if (!req.session.username) {
      res.sendStatus(403);
      return;
    }

    if (!currentBattleRound) {
      res.json({ notStarted: true });
      return;
    }

    const participant = currentBattleRound.users[req.session.username];
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

    const puzzle = currentBattleRound.puzzles[puzzleid];
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
  })
);

//scoreboard
async function getScoreboard() {
  try {
    const result = await client.db("sample_data").collection("sample_users").find({}).project({ _id: 0, password: 0, completed_puzzles: 0 });
    return result.toArray();
  } catch (err) {
    console.log(err);
    return null;
  }
}

app.post(
  "/getScoreboard",
  asyncHandler(async (req, res) => {
    const scoreboard = await getScoreboard();
    res.json(scoreboard);
  })
);

async function updateEvent() {
  if (paused) return;
  console.log("updating scoreboard");
  io.emit("update_event", await getScoreboard());
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
startUpdates();

//#region Admin
const adminRouter = express.Router();

const adminCheck = function (req, res, next) {
  const isAdmin = req.session.isAdmin;
  if (isAdmin !== true) {
    res.sendStatus(403);
    return;
  }
  console.log("id admin!");
  next();
};

app.post(
  "/adminLogin",
  asyncHandler(async (req, res) => {
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
  })
);

app.get("/adminLogin", (req, res) => {
  //@ts-ignore
  if (req.session.isAdmin === true) {
    res.sendFile(path.join(__dirname, "public/admin.html"));
  } else {
    res.sendFile(path.join(__dirname, "public/adminLogin.html"));
  }
});

app.get("/admin", adminCheck, (req, res) => {
  console.log("sending file");
  res.sendFile(path.join(__dirname, "public/admin.html"));
});

app.post(
  "/admin/command",
  adminCheck,
  asyncHandler(async (req, res) => {
    const operation = req.body.operation;
    const operand = req.body.operand;
    //amount of points added
    const arguments = req.body.arguments;
    //id of completed puzzle

    // console.log(operation, operand, arguments);
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
            res.status(400).send("Invalid operand");
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
            res.status(400).send("Operation missing arguments");
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
            res.status(400).send("Operation missing arguments");
            return;
        }

      case "START": //starts events (puzzle round, )
        switch (operand) {
          default:
            return;
        }

      case "END": //ends events (puzzle round, battle round)
        switch (operand) {
          default:
            return;
        }

      default:
        res.status(400).send("Invalid Operation");
        return;
    }
  })
);
//#endregion

//socket handling
io.on("connection", (socket) => {
  console.log("a user connected");
});

server.listen(Number(config.host_port), function () {
  //@ts-ignore
  var host = server.address().address;
  //@ts-ignore
  var port = server.address().port;

  console.log(server.address());

  console.log("server at http://localhost:%s/home", port);
});
