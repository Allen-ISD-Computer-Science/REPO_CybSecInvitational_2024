var express = require("express");
var session = require("express-session");
var nodeJsonDB = require("node-json-db");
var path = require("path");
var bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

var app = express();

var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.use(
  session({
    secret: config.express_session_secret,
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);

app.use(express.static(path.join(__dirname, "public")));

// user database holds all user data and uses json as its storage format
var userdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("userDatabase", true, true, "\\"));
var questiondb = new nodeJsonDB.JsonDB(
  new nodeJsonDB.Config("questionsDatabase", true, true, "\\")
);

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
    res.redirect(path.join(config.host_location, "home"));
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

app.post("/login", urlencodedParser, function (req, res) {
  if (!req.body.username || !req.body.password) {
    res.status(401);
  }

  validateUser(req.body.username, req.body.password, function (result, user) {
    if (result == true) {
      req.session.user = user;
      res.redirect(path.join(config.host_location, "home"));
    } else {
      res.status(401);
    }
  });
});

app.get("/logout", function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect(path.join(config.host_location, "login"));
});

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://%s:%s", host, port);
});

function checkLogin(req) {
  console.log("checking login");
  if (req.session.user) {
    return true;
  } else {
    return false;
  }
}

async function validateUser(username, password, next) {
  try {
    const user = await userdb.getData(path.join("/", username));
    if (user.password === password) {
      next(true, user);
    } else {
      next(false);
    }
  } catch (err) {
    console.log(err);
    next(false);
  }
}
