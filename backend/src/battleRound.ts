import express, { Request, Response, Router } from "express";
import { LoginToken, Token, fetchLoginToken, fetchLoginTokenFromRequest, validateLoginToken } from "./loginApi";
import { BattleRound, currentRound } from "./roundApi";
import * as path from "path";

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
}

router.post("/getStatus", validateLoginToken, verifyBattleRound, (req: Request, res: Response) => {
  const token: LoginToken = res.locals.token;
  if (!token) {
    res.sendStatus(500);
    return;
  }

  const round = currentRound as unknown as BattleRound;
  if (round.contestants[token.data.username]) {
    const status: BattleRoundUserStatus = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid };
    res.json(status);
    return;
  }

  const status: BattleRoundUserStatus = { acknowledged: true, alreadyJoined: false, minBid: round.min_bid };
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
    const status: BattleRoundUserStatus = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid };
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
