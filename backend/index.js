const path = require("path");

var express = require("express");
var app = express();

const config = require(path.join(__dirname, "config.json"));

console.log(config);

app.get("/", function (req, res) {
  res.send("hello world");
});

var server = app.listen(Number(config.host_port), function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("server at http://%s:%s", host, port);
});
