var express = require("express");
var session = require("express-session");
var path = require("path");
var bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

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

var app = express();

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

//database functions
async function setPointsOfUser(username, amount) {
  try {
    const result = await client
      .db("PuzzlesSection")
      .collection("Users")
      .findOneAndUpdate({ username: username }, { $set: { points: amount } });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function onPuzzleCorrect(username, amount, id) {
  try {
    const result = await client
      .db("PuzzlesSection")
      .collection("Users")
      .updateOne({ username: username }, { $inc: { points: amount }, $set: { id: true } });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

async function addPointsToUser(username, amount) {
  try {
    const result = await client
      .db("PuzzlesSection")
      .collection("Users")
      .findOneAndUpdate({ username: username }, { $inc: { points: amount } });
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
  try {
    const cursor = await client.db("PuzzlesSection").collection("Puzzles").find(query).project(projection).skip(skip).sort(sort).limit(count);
    return cursor.toArray();
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
  console.log(req.session);
  // check login
  if (req.session.userid) {
    res.sendFile(path.join(__dirname, "public/home.html"));
  } else {
    res.redirect("/login");
  }
});

app.get("/", function (req, res) {
  res.redirect("/login");
});

app.get("/login", function (req, res) {
  if (req.session.userid) {
    res.redirect("/home");
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

//actions
//logout
app.get("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect("/login");
});

//login
app.post(
  "/login",
  asyncHandler(async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
      res.sendStatus(401);
      return;
    }

    var user = await fetchUser(username);
    if (!user) {
      res.sendStatus(404);
      return;
    }

    if (user.password === password) {
      req.session.userid = user.username;
      res.redirect("/home");
      return;
    } else {
      console.log("invalid login credentials");
      res.status(401).redirect("/login");
      return;
    }
  })
);

//puzzle interactions
app.get(
  "/getPuzzle",
  asyncHandler(async (req, res) => {
    const id = req.query.id;
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

app.get(
  "/getAllPuzzles",
  asyncHandler(async (req, res) => {
    const dbquery = req.query.query;
    const sort = req.query.sort;
    const projection = req.query.projection;
    const count = req.query.count;
    const skip = req.query.skip;

    console.log("attempting to fetch all puzzles");

    const puzzles = fetchPuzzles(dbquery, sort, projection, count, skip);
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
    const userid = req.session.userid;
    const id = req.body.id;
    const answer = req.body.answer;

    if (!id || !answer || !userid) {
      res.sendStatus(400);
      return;
    }

    const userData = await fetchUser(userid);
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

    if (userData.completed_puzzles[puzzle.id]) {
      res.json({ alreadyCompleted: true });
      return;
    } else {
      if (puzzle.answer === answer) {
        const result = onPuzzleCorrect(userid, puzzle.points, puzzle.id);
        if (!result) {
          res.sendStatus(500);
          return;
        }
        res.json({ correct: true });
        return;
      } else {
        res.json({ corret: false });
        return;
      }
    }
  })
);

//user interactions
app.get(
  "/getUser",
  asyncHandler(async (req, res) => {
    const userid = req.session.userid;
    if (!userid) {
      res.sendStatus(400);
      return;
    }

    var user = await fetchUser(userid);
    delete user.password;
    delete user._id;
    res.json(user);
  })
);

app.get(
  "/getUsers",
  asyncHandler(async (req, res) => {
    const dbquery = req.query.query;
    const sort = req.query.sort;
    const projection = req.query.projection;
    const count = req.query.count;
    const skip = req.query.skip;

    const users = await fetchUsers(dbquery, sort, projection, count, skip);

    users.forEach((user) => {
      delete user._id;
      delete user.password;
      delete user.completed_puzzles;
    });
    res.json(UserArray);
  })
);

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://localhost:%s/home", port);
});
