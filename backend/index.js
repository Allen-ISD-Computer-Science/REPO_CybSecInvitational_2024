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

app.get("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect(path.join(config.host_location, "login"));
});

app.post("/getPuzzle", function (req, res) {
  console.log("attempting to fetch puzzle");
  const id = req.body.id;
  if (!id) {
    console.log("not found");
    res.status(400);
    return;
  }

  fetchPuzzlesOfId(id, function (puzzle) {
    if (!puzzle) {
      res.status(404);
    } else {
      res.json(puzzle);
    }
  });
});

async function fetchPuzzlesOfId(id, next) {
  try {
    const puzzle = await puzzlesdb.getData(":" + id);
    next(puzzle);
  } catch (err) {
    console.log(err);
    next(null);
  }
}

app.post(
  "/getAllPuzzles",
  asyncHandler(async (req, res) => {
    console.log("attempting to fetch all puzzles");

    var puzzles = null;
    try {
      puzzles = await puzzlesdb.getData(":");
    } catch (err) {
      console.log(err);
    }

    if (!puzzles) {
      res.status(500);
    } else {
      res.json(puzzles);
    }
  })
);

app.post("/submitPuzzle", function (req, res) {
  console.log("attempting to submit puzzle");
  if (!checkLogin(req)) {
    res.sendStatus(400);
  }

  const userid = req.session.user;
  const id = req.body.id;
  const answer = req.body.answer;

  if (!id || !answer) {
    res.sendStatus(400);
    return;
  }

  const checkResponse = checkPuzzleAnswer();
  if (!checkResponse.exists) {
    res.sendStatus(400);
    return;
  }

  if (checkResponse.correct) {
    res.send({ correct: true });
    return;
  } else {
    res.send({ correct: false });
    return;
  }
});

async function checkPuzzleAnswer(id, answer, next) {
  return new Promise((resolve) => {
    try {
      const puzzleAnswer = answersdb.getData(":" + id);
      if (puzzleAnswer === answer) {
        next({ exists: true, correct: true });
      } else {
        next({ exists: true, correct: false });
      }
    } catch (err) {
      console.log(err);
      next({ exists: false, correct: false });
    }
  });
}

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
