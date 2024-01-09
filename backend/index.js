var express = require("express");
var session = require("express-session");
var nodeJsonDB = require("node-json-db");
var path = require("path");
var bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

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

// user database holds all user data and uses json as its storage format
var userdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("userDatabase", true, true, ":"));

// only holds descriptive elements of puzzles
var puzzlesdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("questionsDatabase", true, true, ":"));
// holds actual answers corresponding with puzzle id/name
var answersdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("questionsAnswersDatabase", true, true, ":"));

//async handling
const asyncHandler = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next)).catch(next);
};

//routing
app.get("/home", function (req, res) {
  console.log(req.session);
  if (checkLogin(req)) {
    res.sendFile(path.join(__dirname, "public/home.html"));
  } else {
    res.redirect(path.join(config.host_location, "login"));
  }
});

app.get("/login", function (req, res) {
  if (req.session.user) {
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

//actions
app.post(
  "/login",
  asyncHandler(async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
      res.status(401);
      return;
    }

    var user = null;
    try {
      user = await userdb.getData(":" + username);
    } catch (err) {
      if (err.id == 5) {
        console.log("User not found");
      }
      res.status(404);
      return;
    }

    if (user.password === password) {
      req.session.user = user;
      res.redirect("/home");
      return;
    } else {
      console.log("invalid login credentials");
      res.status(401).redirect("/login");
      return;
    }
  })
);

app.post(
  "/getPuzzle",
  asyncHandler(async (req, res) => {
    console.log("attempting to fetch puzzle");

    const id = req.body.id;
    if (!id) {
      // Bad request
      res.status(400);
      return;
    }

    try {
      const puzzle = await puzzlesdb.getData(":" + id);
      res.json(puzzle);
      return;
    } catch (err) {
      // not found
      res.status(404);
      return;
    }
  })
);

app.post(
  "/getAllPuzzles",
  asyncHandler(async (req, res) => {
    console.log("attempting to fetch all puzzles");

    try {
      var puzzles = Object.values(await puzzlesdb.getData(":"));
      puzzles.forEach((puzzle) => {
        // remove description for smaller package
        delete puzzle.description;
      });
      res.json(puzzles);
      return;
    } catch (err) {
      // failed to fetch puzzles
      console.log(err);
      res.status(500);
      return;
    }
  })
);

app.post(
  "/submitPuzzle",
  asyncHandler(async (req, res) => {
    console.log("attempting to submit puzzle");
    if (!checkLogin(req)) {
      res.sendStatus(400);
    }

    const user = req.session.user;

    if (!user) {
      // user is not logged in
      res.redirect("/login");
      return;
    }

    const id = req.body.id;
    const answer = req.body.answer;

    if (!id || !answer) {
      // bad request
      res.sendStatus(400);
      return;
    }

    var puzzleAnswer = null;

    try {
      puzzleAnswer = await answersdb.getData(":" + id);
    } catch (err) {
      console.log(err);
      res.sendStatus(404);
      return;
    }

    if (answer === puzzleAnswer) {
      res.json({ correct: true });
      return;
    } else {
      res.json({ correct: false });
      return;
    }
  })
);

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://localhost:%s/home", port);
});

function checkLogin(req) {
  console.log("checking login");
  if (req.session.user) {
    return true;
  } else {
    return false;
  }
}

async function findUser(username, next) {
  try {
    const user = await userdb.getData(":" + username);
    next(user);
  } catch (err) {
    console.log(err);
    next(null);
  }
}
