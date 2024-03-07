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

export class PuzzleRound extends Round {
  type: "PuzzleRound";

  private static _onEnd() {
    console.log("Puzzle Round Ended");
  }

  constructor(duration: number, id: string, divisions: string[]) {
    let divisionsObj: { [division: string]: boolean } = {};
    divisions.forEach((val) => {
      divisionsObj[val] = true;
    });

    super(duration, "PuzzleRound", id, divisionsObj, PuzzleRound._onEnd);
    this.type = "PuzzleRound"; // ensure the type of round
  }
}

export interface BattleRoundContestant {
  username: string;
  completedBattleRoundPuzzles: { [puzzleName: string]: { timeCompleted: number } };
  bid: number;
  raw_bid: number;
}

export interface BattleRoundSubmissionResult {
  acknowledged: boolean;
  notFound: boolean;
  alreadyCompleted: boolean;
  correct: boolean;
}

export interface BattleRoundJoinResult {
  acknowledged: boolean;
  success: boolean;
}

const lerp = (a: number, b: number, t: number) => a + t * (b - a);

export class BattleRound extends Round {
  type: "BattleRound";
  puzzles: { [name: string]: BattleRoundPuzzle };
  min_bid: number;
  contestants: { [username: string]: BattleRoundContestant };

  private static async _onEnd() {
    if (!currentRound || currentRound?.type != "BattleRound") return;

    let scoreboard = await fetchScoreboard();
    if (!scoreboard) {
      console.log("Failed to end battle round, scoreboard missing");
      return;
    }

    let round: BattleRound = currentRound as unknown as BattleRound;
    let promises: Promise<any>[] = [];
    scoreboard.forEach((user: ScoreboardUser) => {
      if (!round.divisions[user.division]) {
        return;
      }

      let contestant = round.contestants[user.username];
      if (contestant) {
        // ! Currently only takes number of puzzles completed into account
        let puzzleCount = Object.values(round.puzzles).length;
        let completedCount = Object.values(contestant.completedBattleRoundPuzzles).length;
        let ratio = completedCount / puzzleCount;
        let rewardMultiplier = lerp(0.9, 2, ratio);
        let awardedPoints = Math.floor(contestant.raw_bid * rewardMultiplier - contestant.raw_bid);

        promises.push(addPointsToUser(user.username, awardedPoints, "puzzle_points"));
      } else {
        // ! Currently removes min bid viable with user's current puzzle points
        promises.push(addPointsToUser(user.username, Math.floor(user.puzzle_points * round.min_bid) * -1, "puzzle_points"));
      }
    });
    await Promise.all(promises);

    console.log("Battle Round Ended");
  }

  submit(username: string, name: string, answer: string): BattleRoundSubmissionResult {
    let contestant = this.contestants[username];
    if (!contestant) return { acknowledged: false, notFound: false, alreadyCompleted: false, correct: false }; // Not part of battle round

    let puzzle = this.puzzles[name];
    if (!puzzle) return { acknowledged: false, notFound: true, alreadyCompleted: false, correct: false }; // Puzzle not part of battle round
    if (contestant.completedBattleRoundPuzzles[name]) return { acknowledged: true, notFound: false, alreadyCompleted: true, correct: false }; // Already completed puzzle
    if (puzzle.answer !== answer) return { acknowledged: true, notFound: false, alreadyCompleted: false, correct: false }; // Wrong answer

    contestant.completedBattleRoundPuzzles[name] = { timeCompleted: Date.now() };
    return { acknowledged: true, notFound: false, alreadyCompleted: false, correct: true };
  }

  async joinRound(username: string, bid: number): Promise<BattleRoundJoinResult> {
    let user = await fetchUser(username);
    if (!user) return { acknowledged: false, success: false };

    let boundedBid = Math.max(0, Math.min(bid, 1));
    if (boundedBid < this.min_bid) {
      return { acknowledged: true, success: false };
    }

    let contestant: BattleRoundContestant = {
      username: username,
      completedBattleRoundPuzzles: {},
      bid: boundedBid,
      raw_bid: Math.min(user.puzzle_points * boundedBid),
    };

    this.contestants[username] = contestant;
    return { acknowledged: true, success: true };
  }

  constructor(duration: number, id: string, minBid: number, puzzles: { [name: string]: BattleRoundPuzzle }, divisions: string[]) {
    let divisionsObj: { [division: string]: boolean } = {};
    divisions.forEach((val) => {
      divisionsObj[val] = true;
    });

    super(duration, "BattleRound", id, divisionsObj, BattleRound._onEnd);
    this.type = "BattleRound"; // ensure the type of round
    this.puzzles = puzzles;
    this.min_bid = minBid;
    this.contestants = {};
  }
}

export class ScenarioRoundUserState {
  username: string;
  systemStatus = {
    solar_panel: true,
    truss_integrity: true,
    docking_port: true,
    life_support: true,
    communications: true,
  };

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
}

// * Module Parameters
export var currentRound: Round | null = null;

//
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

export function startPuzzleRound(id: string, divisions: string[], duration: number = config.puzzle_round_duration): boolean {
  let round = new PuzzleRound(duration, id, divisions);
  return startRound(round);
}

export function startScenarioRound(id: string, divisions: string[], duration: number = config.puzzle_round_duration): boolean {
  let round = new ScenarioRound(duration, id, divisions);
  return startRound(round);
}

export async function startBattleRound(id: string, divisions: string[], duration: number = config.battle_round_duration): Promise<boolean> {
  const roundConfig = config.battle_rounds[id];
  if (!roundConfig || !roundConfig.min_bid) return false;

  const roundPuzzles = await fetchBattleRoundPuzzles(id);
  if (!roundPuzzles) return false;

  let round = new BattleRound(duration, id, roundConfig.min_bid, roundPuzzles, divisions);

  return startRound(round);
}
