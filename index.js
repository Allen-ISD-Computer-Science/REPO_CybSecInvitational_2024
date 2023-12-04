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
app.use(express.static(__dirname));

// cookie parser middleware
app.use(cookieParser());

app.get("/", (req, res) => {
  console.log("printing");
  res.sendFile(path.join(__dirname, "index.js"));
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
