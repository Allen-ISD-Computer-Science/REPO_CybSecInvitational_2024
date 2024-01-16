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
  console.log(username, amount, id);

  try {
    const result = await client
      .db("PuzzlesSection")
      .collection("Users")
      .updateOne({ username: username }, { $inc: { points: amount }, $set: { completed_puzzles: { [id]: true } } });
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
  // console.log(query, sort, projection, count, skip);
  // console.log(sort);

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
  if (req.session.username) {
    res.sendFile(path.join(__dirname, "public/home.html"));
  } else {
    res.redirect("/login");
  }
});

app.get("/", function (req, res) {
  res.redirect("/login");
});

app.get("/login", function (req, res) {
  if (req.session.username) {
    res.redirect("/home");
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

app.get("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect("/login");
});

app.get("/puzzles", function (req, res) {
  if (!req.session.username) {
    res.redirect("/login");
  } else {
    res.sendFile(path.join(__dirname, "public/puzzles.html"));
  }
});

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public/404.html"));
});

//actions
//login
app.post(
  "/login",
  asyncHandler(async (req, res) => {
    console.log("attempting login ");

    const username = req.body.username;
    const password = req.body.password;

    console.log(username, password);
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
      res.redirect("/home");
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

    console.log(dbquery);

    const puzzles = await fetchPuzzles(Object(dbquery), Object(sort), Object({ ...projection, answer: 0, _id: 0, description: 0 }), Number(count), Number(skip));

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

    console.log(username, id, answer);

    if (!id || !answer || !username) {
      res.sendStatus(400);
      return;
    }

    const userData = await fetchUser(username);
    if (!userData) {
      res.sendStatus(400);
    }

    const puzzle = await fetchPuzzle(id);
    console.log(puzzle);
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

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://localhost:%s/home", port);
});
