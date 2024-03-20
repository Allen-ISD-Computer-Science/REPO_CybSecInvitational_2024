import express, { Request, Response, Router } from "express";
import { LoginToken, Token, fetchLoginToken, fetchLoginTokenFromRequest, validateLoginToken } from "./loginApi";
import { Round, currentRound, startRound } from "./roundApi";
import * as path from "path";
import { ScoreboardUser, addPointsToUser, fetchBattleRoundPuzzles, fetchScoreboard, fetchUser } from "./mongoApi";
const config = require("../config.json");

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

//* Methods
export async function startBattleRound(id: string, divisions: string[], duration: number = config.battle_round_duration): Promise<boolean> {
  const roundConfig = config.battle_rounds[id];
  if (!roundConfig || !roundConfig.min_bid) return false;

  const roundPuzzles = await fetchBattleRoundPuzzles(id);
  if (!roundPuzzles) return false;

  let round = new BattleRound(duration, id, roundConfig.min_bid, roundPuzzles, divisions);

  return startRound(round);
}

//* Routes
export const router: Router = express.Router();

export function verifyBattleRound(req: Request, res: Response, next: Function) {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  if (!token) {
    res.sendStatus(500);
    return;
  }

  if (currentRound?.type != "BattleRound" || !currentRound.divisions[token.data.division.toString()]) {
    res.redirect("home");
    return;
  }
  next();
}

router.get("/", validateLoginToken, verifyBattleRound, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/battleRound.html"));
});

export interface BattleRoundUserStatus {
  acknowledged: boolean;
  alreadyJoined: boolean;
  minBid: number;
  endTime: number;
}

router.post("/getStatus", validateLoginToken, verifyBattleRound, (req: Request, res: Response) => {
  const token: LoginToken = res.locals.token;
  if (!token) {
    res.sendStatus(500);
    return;
  }

  const round = currentRound as unknown as BattleRound;
  if (round.contestants[token.data.username]) {
    const status: BattleRoundUserStatus = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid, endTime: round.endTime };
    res.json(status);
    return;
  }

  const status: BattleRoundUserStatus = { acknowledged: true, alreadyJoined: false, minBid: round.min_bid, endTime: round.endTime };
  res.json(status);
});

router.post("/join", validateLoginToken, verifyBattleRound, async (req: Request, res: Response) => {
  const bid = Number(req.body.bid);
  if (!bid && bid !== 0) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const token: LoginToken = res.locals.token;
  if (!token) {
    res.sendStatus(500);
    return;
  }

  const round = currentRound as unknown as BattleRound;
  if (round.contestants[token.data.username]) {
    const status: BattleRoundUserStatus = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid, endTime: round.endTime };
    res.json(status);
    return;
  }

  res.json(await round.joinRound(token.data.username, bid));
});

router.post("/getPuzzles", validateLoginToken, verifyBattleRound, async (req: Request, res: Response) => {
  const token: LoginToken = res.locals.token;
  if (!token) {
    res.sendStatus(500);
    return;
  }

  const round = currentRound as unknown as BattleRound;
  const puzzles = round.puzzles;
  const contestant = round.contestants[token.data.username];

  const bundle = [];
  for (let name in puzzles) {
    const puzzle = puzzles[name];
    const packet = {
      name: puzzle.name,
      completed: false,
    };
    if (contestant && contestant.completedBattleRoundPuzzles[puzzle.name]) {
      packet.completed = true;
    }
    bundle.push(packet);
  }

  res.json(bundle);
});

router.post("/getPuzzle", validateLoginToken, verifyBattleRound, async (req: Request, res: Response) => {
  const name = req.body.name;
  if (!name) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const round = currentRound as unknown as BattleRound;
  const puzzle = round.puzzles[name];
  res.json({
    name: puzzle.name,
    description: puzzle.description,
  });
});

router.post("/submitPuzzle", validateLoginToken, verifyBattleRound, async (req: Request, res: Response) => {
  const name: string = req.body.name;
  const answer: string = req.body.answer;

  if (!name || !answer) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const token: LoginToken = res.locals.token;
  if (!token) {
    res.sendStatus(500);
    return;
  }

  const round = currentRound as unknown as BattleRound;
  const result = round.submit(token.data.username, name, answer);
  res.json(result);
});
