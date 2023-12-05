const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const path = require("node:path");

const app = express();
const server = createServer(app);
const io = new Server(server);

const fs = require("fs");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const PORT = 4000;

const oneDay = 1000 * 60 * 60 * 24;
const sessionMiddleware = session({
  secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
  saveUninitialized: true,
  cookie: { maxAge: oneDay },
  resave: false,
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

//routes

// parsing the incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serving public file
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// cookie parser middleware
app.use(cookieParser());

app.get("/", (req, res) => {
  var req = req.session;
  console.log(req);
  if (session.userid == "username") {
    res.sendFile(path.join(__dirname, "index.html"));
  } else {
    res.redirect("login");
    console.log("printing");
  }
});

app.get("/login", (req, res) => {
  console.log(req.query);
  if (req.query.teamId == "username" && req.query.password == "password") {
    res.redirect("/");
  } else {
    req.session.userid = "username";
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
});

app.get("/test", (req, res) => {
  console.log("printing");
  res.send("sproing");
});

io.on("connection", (socket) => {
  console.log("user connected");

  //session
  const session = socket.request.session;

  //events
  socket.on("test event", (msg) => {
    console.log(msg);
    io.emit("test event", "server sent this");
  });
});

server.listen(PORT, () => {
  console.log("server running at http://localhost:" + String(PORT));
});

//404 error
app.use(function (req, res, next) {
  res.status(404);

  // respond with html page
  if (req.accepts("html")) {
    res.sendFile(path.join(__dirname, "public/404.html"));
    return;
  }

  // respond with json
  if (req.accepts("json")) {
    res.json({ error: "Not found" });
    return;
  }

  // default to plain-text. send()
  res.type("txt").send("Not found");
});
