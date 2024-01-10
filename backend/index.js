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
app.post("/logout", function (req, res) {
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

    var user = null;
    try {
      user = await userdb.getData(":" + username);
    } catch (err) {
      if (err.id == 5) {
        console.log("User not found");
      }
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

    try {
      const puzzle = await puzzlesdb.getData(":" + id);
      delete puzzle.answer; // we dont want users to be able to see the answers!

      res.json(puzzle);
      return;
    } catch (err) {
      console.log(err);
      // not found
      res.sendStatus(404);
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
      res.sendStatus(500);
      return;
    }
  })
);

app.post(
  "/submitPuzzle",
  asyncHandler(async (req, res) => {
    console.log("attempting to submit puzzle");

    if (!req.session.userid) {
      res.sendStatus(400);
    }

    const userid = req.session.userid;
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
      userData = await userdb.getData(":" + userid);
    } catch (err) {
      console.log("failed to find user of username: " + userid);
      res.sendStatus(500);
      return;
    }
    console.log(userData);

    if (answer === puzzle.answer) {
      const alreadyCompleted = userData.completed_puzzles[puzzle.id];
      if (!alreadyCompleted) {
        // update completed puzzles
        userData.completed_puzzles[puzzle.id] = true;
        userdb.push(`:${userData.username}:completed_puzzles`, userData.completed_puzzles);

        // update points
        userdb.push(`:${userData.username}:points`, userData.points + puzzle.point_value);
      }
      res.json({ correct: true });
      return;
    } else {
      res.json({ correct: false });
      return;
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

    var user = await userdb.getData(":" + userid);
    delete user.password;

    console.log(user);
    res.json(user);
  })
);

app.get(
  "/getAllUsers",
  asyncHandler(async (req, res) => {
    const users = await userdb.getData(":");
    console.log(users);
    var UserArray = Object.values(users);
    console.log(UserArray);

    UserArray.forEach((user) => {
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
