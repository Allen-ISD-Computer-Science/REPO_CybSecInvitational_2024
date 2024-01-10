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

//Databases (json format)
var userdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("userDatabase", true, true, ":"));
var puzzlesdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("questionsDatabase", true, true, ":"));

//async handling
const asyncHandler = (func) => (req, res, next) => {
  Promise.resolve(func(req, res, next)).catch(next);
};

//routing
app.get("/home", function (req, res) {
  console.log(req.session);
  // check login
  if (req.session.user) {
    res.sendFile(path.join(__dirname, "public/home.html"));
  } else {
    res.redirect("/login");
  }
});

app.get("/", function (req, res) {
  res.redirect("/login");
});

app.get("/login", function (req, res) {
  if (req.session.user) {
    res.redirect("/home");
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

//actions
app.post("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect("/login");
});

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

app.get(
  "/getPuzzle",
  asyncHandler(async (req, res) => {
    const id = req.query.id;
    if (!id) {
      // Bad request
      res.status(400);
      return;
    }

    try {
      const puzzle = await puzzlesdb.getData(":" + id);
      delete puzzle.answer; // we dont want users to be able to see the answers!

      res.json(puzzle);
      return;
    } catch (err) {
      console.log(err);
      // not found
      res.status(404);
      return;
    }
  })
);

app.get(
  "/getAllPuzzles",
  asyncHandler(async (req, res) => {
    console.log("attempting to fetch all puzzles");

    try {
      var puzzles = Object.values(await puzzlesdb.getData(":"));
      puzzles.forEach((puzzle) => {
        delete puzzle.description; // remove description for smaller package size
        delete puzzle.answer; // we dont want users to be able to see the answers!
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
    if (!req.session.user) {
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

    var puzzle = null;
    try {
      puzzle = await puzzlesdb.getData(":" + id);
    } catch (err) {
      console.log(err);
      res.sendStatus(404);
      return;
    }

    if (!puzzle.answer) {
      console.log("puzzle is missing answer");
      res.sendStatus(500);
      return;
    }

    var userData = null;
    try {
      userData = await userdb.getData(":" + user.username);
    } catch (err) {
      console.log("failed to find user of username: " + user.username);
      res.sendStatus(500);
      return;
    }
    console.log(userData);

    if (answer === puzzle.answer) {
      console.log(answer);
      res.json({ correct: true });
      userdb.push(`:${userData.username}:points`, userData.points + puzzle.point_value);
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
