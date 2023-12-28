const nodeJsonDB = require("node-json-db");
const path = require("path");

var express = require("express");
var app = express();
app.use(express.static(path.join(__dirname, "public")));

const config = require(path.join(__dirname, "config.json"));

// user database holds all user data and uses json as its storage format
var userdb = new nodeJsonDB.JsonDB(new nodeJsonDB.Config("userDatabase", true, true, "\\"));

app.get("/login", function (req, res) {
  console.log(req.query);
  const query = req.query;
  if (
    typeof query.username !== "undefined" &&
    query.username !== "" &&
    typeof query.password !== "undefined" &&
    query.password !== ""
  ) {
    validateUser(query.username, query.password).then(function (result) {
      if (result == true) {
        res.redirect("/");
      } else {
        res.status(401).sendFile(path.join(__dirname, "public/login.html"));
      }
    });
  } else {
    res.status(401).sendFile(path.join(__dirname, "public/login.html"));
  }
});

async function validateUser(username, password) {
  try {
    const user = await userdb.getData(path.join("/", username));
    if (user.password === password) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.log(err);
    return false;
  }
}

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://%s:%s", host, port);
});
