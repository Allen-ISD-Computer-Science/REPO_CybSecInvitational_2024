import { Request, Response } from "express";
import * as path from "path";

import { app, server } from "./server";
import * as loginApi from "./loginApi";
import * as userApi from "./usersApi";
import * as puzzleApi from "./puzzleApi";
import * as socketApi from "./socketApi";

const config = require(path.join(__dirname, "../config.json"));
//#region Types
class Round {
  startTime: number;
  endTime: number;
  callback: Function;
  type: string;
  id: string;
  _endTimeout: NodeJS.Timeout; // Used to force end a timeout

  static currentRound: Round | null = null;

  static endCurrentRound() {
    // * Callback is called before currentRound is set to null
    console.log("Attempting Round Closure");
    if (!Round.currentRound) throw Error("No Round In Session");
    clearTimeout(Round.currentRound._endTimeout); // Force stop timeout
    Round.currentRound?.callback();
    Round.currentRound = null;
  }

  constructor(duration: number, type: string, id: string, callback: Function = () => {}) {
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.callback = callback;
    this.type = type;
    this.id = id;
    this._endTimeout = setTimeout(Round.endCurrentRound, duration);
  }
}

class PuzzleRound extends Round {
  type: "PuzzleRound";

  static _onEnd() {
    console.log("Puzzle Round Ended");
  }

  constructor(duration: number, id: string) {
    super(duration, "PuzzleRound", id, PuzzleRound._onEnd);
    this.type = "PuzzleRound";
    Round.currentRound = this;
  }
}
//#endregion

function startPuzzleRound() {
  try {
    let round = new PuzzleRound(10000, "PuzzleRoundId");
    console.log(Round.currentRound);
  } catch (err) {
    console.log(err);
  }
}

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

// Update Loop
setInterval(() => {
  console.log("updating");
}, 5000);
