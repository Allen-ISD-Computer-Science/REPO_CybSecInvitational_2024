import { Request, Response } from "express";
import * as path from "path";

import { app, server } from "./server";
import * as loginApi from "./loginApi";
import * as userApi from "./usersApi";
import * as puzzleApi from "./puzzleApi";
import * as socketApi from "./socketApi";

const config = require(path.join(__dirname, "../config.json"));
// Initialize Routes
app.get("/home", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});

app.get("/", (req: Request, res: Response) => {
  res.redirect("login");
});

app.use("/", loginApi.router);
app.use("/", puzzleApi.router);
app.use("/", userApi.router);

// Initialize Socket Server
socketApi.init();

// Initialize Puzzles
puzzleApi.replicatePuzzles();

// Host http server at port
server.listen(Number(config.host_port), function () {
  console.log(server.address());
  console.log("server at http://localhost:%s/", server.address().port);
});

interface UpdatePacket {}

// Update Loop
setInterval(() => {
  let updatePacket: UpdatePacket = {};

  console.log("updating");
}, 5000);
