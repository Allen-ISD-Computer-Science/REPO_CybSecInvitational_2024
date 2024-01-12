var express = require("express");
var session = require("express-session");
var path = require("path");
var bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

const mongo_username = encodeURIComponent(config.mongodb_username);
const mongo_password = encodeURIComponent(config.mongodb_password);

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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

async function fetchUser(query) {
  const result = await client.db("PuzzlesSection").collection("Users").find(query).project({ username: 1, password: 1, points: 1 });

  console.log(await result.next());
  await result.close();
  // const result2 = await client
  //   .db("PuzzlesSection")
  //   .collection("Users")
  //   .updateOne({ id: result._id }, { points: result.points + 10 });
  // console.log(result);
}

fetchUser({ username: "username" });

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

async function listDatabases() {
  const dbList = await client.db().admin().listDatabases();
  console.log("Databases");
  dbList.databases.forEach((db) => {
    console.log(db.name);
  });
}
listDatabases();

//Databases (json format)
// var userdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("userDatabase", true, false, ":"));
// var puzzlesdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("questionsDatabase", true, false, ":"));

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

    console.log(username, password);

    if (!username || !password) {
      res.sendStatus(401);
      return;
    }

    var user = null;
    try {
      user = await userdb.getData(":" + username);
      console.log(user);
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

    console.log(await userdb.getData(":"));
    res.json(UserArray);
  })
);

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://localhost:%s/home", port);
});
