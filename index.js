const fs = require("fs");
const path = require("node:path");

const { createServer } = require("node:http");

const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const { Server } = require("socket.io");

// application declarations
const app = express();
const server = createServer(app);
const io = new Server(server);

const PORT = 4000;

// routers
const dashboard = require("./routers/dashboard");
const userdata = require("./routers/userdata");

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
app.use("/dashboard", dashboard);
app.use("/userdata", userdata);

// parsing the incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serving public file
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// cookie parser middleware
app.use(cookieParser());

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  console.log(req.query);
  const session = req.session;
  if (session.userid !== undefined) {
    // user has already logged in
    res.redirect("/dashboard");
  } else if (req.query.teamId == "username" && req.query.password == "password") {
    // test if user put in correct credentials, currently placeholder hard coded
    const session = req.session;
    session.userid = "username";
    res.redirect("/dashboard");
  } else {
    res.sendFile(path.join(__dirname, "public/login.html"));
  }
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

console.log(userdata.sortUsersAlphabetically(userdata.getUserData()));
