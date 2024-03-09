import { io } from "./socketApi";
import { ScoreboardUser, addPointsToUser, fetchBattleRoundPuzzles, fetchScoreboard, fetchUser } from "./mongoApi";
const config = require("../config.json");

export class Round {
  startTime: number;
  endTime: number;
  callback: Function;
  type: string;
  id: string;
  _endTimeout: NodeJS.Timeout; // Used to force end a timeout

  divisions: { [id: string]: boolean };

  getSummary(): { [property: string]: any } {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
      type: this.type,
      id: this.id,
    };
  }

  constructor(duration: number, type: string, id: string, divisions: { [id: string]: boolean } = { "0": true, "1": true, "2": true }, callback: Function = () => {}) {
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.callback = callback;
    this.type = type;
    this.id = id;
    this._endTimeout = setTimeout(endCurrentRound, duration);
    this.divisions = divisions;

    console.log(this.divisions);
  }
}

// * Module Parameters
export var currentRound: Round | null = null;

//* Methods
export async function endCurrentRound() {
  // * Callback is called before currentRound is set to null
  console.log("Attempting Round Closure");
  if (!currentRound) return;

  clearTimeout(currentRound._endTimeout); // Force stop timeout
  await currentRound.callback();
  currentRound = null;
  io.emit("round_end");
}

export function startRound(round: Round): boolean {
  console.log("Attempting Round Start");
  if (currentRound) {
    return false;
  } else {
    currentRound = round;
    io.emit("round_start", currentRound.getSummary());
    return true;
  }
}
