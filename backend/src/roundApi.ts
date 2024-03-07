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

export class ScenarioRoundUserState {
  username: string;
  status = {
    solar_panel: true,
    truss_integrity: true,
    docking_port: true,
    life_support: true,
    communications: true,
  };

  users = {};

  constructor(username: string) {
    this.username = username;
  }
}

export class ScenarioRound extends Round {
  type: "ScenarioRound";

  state: { [username: string]: ScenarioRoundUserState } = {};

  private static _onEnd() {
    console.log("Puzzle Round Ended");
  }

  constructor(duration: number, id: string, divisions: string[]) {
    let divisionsObj: { [division: string]: boolean } = {};
    divisions.forEach((val) => {
      divisionsObj[val] = true;
    });

    super(duration, "ScenarioRound", id, divisionsObj, ScenarioRound._onEnd);
    this.type = "ScenarioRound"; // ensure the type of round
  }

  async init(): Promise<boolean> {
    const scoreboard = await fetchScoreboard();
    if (!scoreboard) {
      return false;
    }

    scoreboard.forEach((member) => {
      this.state[member.username] = new ScenarioRoundUserState(member.username);
    });
    return true;
  }

  getUserState(username: string): ScenarioRoundUserState | null {
    return this.state[username];
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

export function startScenarioRound(id: string, divisions: string[], duration: number = config.puzzle_round_duration): boolean {
  let round = new ScenarioRound(duration, id, divisions);
  return startRound(round);
}
