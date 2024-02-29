import { Request, Response } from "express";

import * as path from "path";
import * as serverApi from "./server";

import * as TokenApi from "./loginApi";
import { app, server } from "./server";

import * as mongoApi from "./mongoApi";
import { ObjectId } from "mongodb";

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

app.get("/home", TokenApi.validateLoginToken, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/home.html"));
});

app.get("/", (req: Request, res: Response) => {
  res.redirect("login");
});

import { router as puzzleRouter } from "./puzzleApi";
app.use("/", puzzleRouter);

import * as socketApi from "./socketApi";
socketApi.init(); //initialize socket server

// Host http server at port
server.listen(Number(config.host_port), function () {
  console.log(server.address());
  console.log("server at http://localhost:%s/", server.address().port);
});
