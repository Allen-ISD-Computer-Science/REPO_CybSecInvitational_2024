const express = require("express");
const { createServer } = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

const app = express();
const server = createServer(app);
const io = new Server(server);

const router = express.Router();

const mongo_username = encodeURIComponent(config.mongodb_username);
const mongo_password = encodeURIComponent(config.mongodb_password);

if (!mongo_password || !mongo_username) {
  throw new Error("Missing Mongodb credentials!");
}

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  session({
    secret: config.express_session_secret,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);

app.use(express.static(path.join(__dirname, "public")));

router.get("/testRequest", (req, res) => {
  console.log("gotten");
  res.send("check the url");
});

app.use("/vapor/soohan-cho", router);

//database functions
async function onPuzzleCorrect(username, amount, id) {
  console.log(username, amount, id);

  try {
    const result = await client
      .db("PuzzlesSection")
      .collection("Users")
      .updateOne({ username: username }, { $inc: { puzzle_points: amount }, $set: { [`completed_puzzles.${id}`]: true } });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchUser(username) {
  try {
    const result = await client.db("PuzzlesSection").collection("Users").findOne({ username: username });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchUsers(query = {}, sort = {}, projection = {}, count = 1, skip = 0) {
  try {
    const cursor = await client.db("PuzzlesSection").collection("Users").find(query).project(projection).skip(skip).sort(sort).limit(count);
    return cursor.toArray();
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchPuzzle(name) {
  try {
    const result = await client.db("PuzzlesSection").collection("Puzzles").findOne({ name: name });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function fetchPuzzles(query = {}, sort = {}, projection = {}, count = 1, skip = 0) {
  // console.log(query, sort, projection, count, skip);
  // console.log(sort);

  try {
    const cursor = await client.db("PuzzlesSection").collection("Puzzles").find(query).project(projection).skip(skip).sort(sort).limit(count);
    return cursor;
  } catch (err) {
    console.log(err);
    return null;
  }
}

//async handling
const asyncHandler = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next)).catch(next);
};

//routing
app.get("/home", function (req, res) {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public/home.html"));
  } else {
    res.redirect("login");
  }
});

app.get("/", function (req, res) {
  res.redirect(config.host_relative_path + "/login");
});

app.get("/login", function (req, res) {
  if (req.session.username) {
    res.redirect("home");
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect(config.host_relative_path + "/login");
});

app.get("/scoreboard", function (req, res) {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public/scoreboard.html"));
  } else {
    res.redirect(config.host_relative_path + "/login");
  }
});

app.get("/puzzles", function (req, res) {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public/puzzles.html"));
  } else {
    res.redirect(config.host_relative_path + "/login");
  }
});

app.get("/battleRound", function (req, res) {
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public/battleRound.html"));
  } else {
    res.redirect(config.host_relative_path + "/login");
  }
});

app.get("*", function (req, res) {
  res.redirect(config.host_relative_path + "/home");
  // res.sendFile(path.join(__dirname, "public/404.html"));
});

//actions
//login
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
      res.redirect(config.host_relative_path + "/home");
      return;
    } else {
      console.log("invalid login credentials");
      res.sendStatus(401);
      return;
    }
  })
);

//puzzle interactions
app.post(
  "/getPuzzle",
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
  asyncHandler(async (req, res) => {
    console.log("attempting to fetch puzzles");

    const dbquery = req.body.query;
    const sort = req.body.sort;
    const projection = req.body.projection;
    const count = req.body.count;
    const skip = req.body.skip;

    const cursor = await fetchPuzzles(Object(dbquery), Object(sort), Object({ ...projection, answer: 0, _id: 0, description: 0 }), Number(count), Number(skip));
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

//user interactions

app.post(
  "/getUser",
  asyncHandler(async (req, res) => {
    const username = req.session.username;
    if (!username) {
      res.sendStatus(400);
      return;
    }

    var user = await fetchUser(username);
    delete user.password;
    delete user._id;
    res.json(user);
  })
);

app.post(
  "/getUsers",
  asyncHandler(async (req, res) => {
    const dbquery = req.body.query;
    const sort = req.body.sort;
    const projection = req.body.projection;
    const count = req.body.count;
    const skip = req.body.skip;

    const users = await fetchUsers(dbquery, sort, projection, count, skip);

    users.forEach((user) => {
      delete user._id;
      delete user.password;
      delete user.completed_puzzles;
    });
    res.json(UserArray);
  })
);

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
    return;
  } else {
    console.log("Ending Battle Round");
  }

  if (Object.keys(currentBattleRound.users).length <= 0) {
    currentBattleRound = null;
    console.warn("No users in battle round");
    return; //no users took part in the battle round
  }

  let participants = Object.values(currentBattleRound.users);

  participants.sort((a, b) => {});

  participants.forEach((participant, i) => {
    const user = participant.user;
    const username = user.username;
    const k = i / (participants.length - 1);
    console.log(k);
    const multiplier = lerp(config.battle_round_max_multiplier, config.battle_round_min_multiplier, k);
    console.log(username, multiplier, multiplier * participant.bid);
  });

  currentBattleRound = null;
}

async function startBattleRound(battleRoundId) {
  const battleRoundPuzzleIds = config[battleRoundId];
  console.log(battleRoundPuzzleIds);
  if (!battleRoundPuzzleIds) {
    console.warn("Battle round of id " + battleRoundId + " not found");
    return;
  }

  puzzles = {};
  for (let puzzleId of battleRoundPuzzleIds) {
    var result = null;
    try {
      result = await client.db("PuzzlesSection").collection("BattleRoundPuzzles").findOne({ name: puzzleId });
    } catch (err) {
      console.log(err);
      return;
    }

    if (!result) {
      console.warn("Failed to fetch puzzle of id " + puzzleId);
      return;
    } else {
      delete result._id;
      puzzles[result.name] = result;
      // puzzles.push(result);
    }
  }

  currentBattleRound = {
    id: battleRoundId,
    puzzles: puzzles,
    startTime: Date.now(),
    users: {},
  };
}

startBattleRound("battle_round_1_puzzles").then(() => {
  // console.log("BattleRound Started");
  // Promise.all([onJoinBattleRound("username", 0.5), onJoinBattleRound("user1", 0.25)]).then(() => {
  //   endBattleRound();
  // });
});

//battle round
app.post(
  "/battleRound/join",
  asyncHandler(async (req, res) => {
    if (!req.session.username) {
      res.sendStatus(403);
      return;
    }

    const bidPercentage = req.body.bid;
    if (!bidPercentage) {
      res.sendStatus(400);
      return;
    }

    if (!currentBattleRound) {
      res.json({ success: false, notStarted: true });
      return;
    }

    const user = await fetchUser(req.session.username);
    delete user._id;
    delete user.password;
    delete user.completed_puzzles;
    if (!user) {
      res.sendStatus(403);
      return;
    }

    if (currentBattleRound.users[req.session.username]) {
      res.json({ success: false, alreadyJoined: true });
      return;
    }

    const bid = Math.max(Math.min(Math.floor(user.puzzle_points * bidPercentage), user.puzzle_points), 0);

    // try {
    //   const result = await client
    //     .db("PuzzlesSection")
    //     .collection("Users")
    //     .updateOne({ username: req.session.username }, { $set: { puzzle_points: user.puzzle_points - bid } });
    // if (result) user.puzzle_points -= bid
    // } catch (err) {
    //   console.log(err);
    // res.sendStatus(500)
    //   return;
    // }

    currentBattleRound.users[req.session.username] = {
      user: user,
      bid: bid,
      completed: {},
    };
    console.log(currentBattleRound.users);

    res.json({ success: true });
    console.log(currentBattleRound);
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
    const result = await client.db("PuzzlesSection").collection("Users").find({}).project({ _id: 0, password: 0, completed_puzzles: 0 });
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
  scoreboard = await getScoreboard();
  io.emit("update_event", scoreboard);
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

//socket handling
io.on("connection", (socket) => {
  console.log("a user connected");
});

server.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log(server.address());

  console.log("server at http://localhost:%s/home", port);
});

console.log(process);
