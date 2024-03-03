import * as path from "path";
import express, { Request, Response, Router } from "express";

require("../config.json");

import { addPointsToUser, battleRoundPuzzlesColName, client, fetchUser, mainDbName, onPuzzleCorrect, puzzlesColName } from "./mongoApi";
import { fetchLoginToken, validateLoginToken } from "./loginApi";
import { currentRound } from "./roundApi";

// * Module Type Declarations
interface PuzzleDescription {
  name: string;
  description: string;
  point_value: number;
  difficulty: 0 | 1 | 2 | 3; // Easy, Medium, Hard, Master
  category: string; //
}

interface PuzzleData {
  name: string;
  point_value: number;
  difficulty: 0 | 1 | 2 | 3; // Easy, Medium, Hard, Master
  category: string; //
}

export class PuzzleSubmitResult {
  correct: boolean;
  alreadyCompleted: boolean;

  constructor(alreadyCompleted: boolean, correct: boolean) {
    this.alreadyCompleted = alreadyCompleted;
    this.correct = correct;
  }
}

// * Module Parameters
export var puzzles: { [name: string]: Puzzle } = {};
export var battleRoundPuzzles: { [name: string]: Puzzle } = {};

// * Methods
// Replicates all current puzzles in db to puzzles variable
export async function replicatePuzzles() {
  try {
    const result = (await client.db(mainDbName).collection(puzzlesColName).find({}).toArray()) as unknown as Puzzle[];

    if (!result) {
      console.warn("Failed to replicate puzzles from backend!");
    } else {
      result.forEach((puzzle) => {
        puzzles[puzzle.name] = puzzle;
      });
    }
  } catch (err) {
    console.log(err);
  }
}

// fetches puzzle from puzzles variable
export function fetchPuzzle(name: string): Puzzle | null {
  // return copy of puzzle
  return { ...puzzles[name] };
}

// fetches all puzzles excluding description and answer
export function fetchAllPuzzleData(): PuzzleData[] {
  let puzzleData = [];

  for (let puzzleName in puzzles) {
    let value = fetchPuzzle(puzzleName) as unknown as { [_: string]: any };
    delete value._id;
    delete value.answer;
    delete value.description;

    puzzleData.push(value as PuzzleData);
  }

  return puzzleData;
}

// fetches only the description data of puzzle
export function fetchPuzzleDescription(name: string): PuzzleDescription | null {
  let puzzle = fetchPuzzle(name) as unknown as { [any: string]: any };
  if (!puzzle) return null;

  delete puzzle._id;
  delete puzzle.answer;

  return puzzle as PuzzleDescription;
}

// * Routes
export const router: Router = express.Router();

// router middleware
export function verifyPuzzleRound(req: Request, res: Response, next: Function) {
  if (currentRound?.type !== "PuzzleRound") {
    res.redirect("home");
  }

  next();
}

// serves puzzle page
router.get("/puzzles", validateLoginToken, verifyPuzzleRound, async (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/puzzles.html"));
});

// used to fetch puzzle description from client side
router.post("/getPuzzle", validateLoginToken, async (req: Request, res: Response) => {
  const name: string = req.body.name;
  if (!name) {
    res.status(400).send("Missing Puzzle Name");
    return;
  }

  const puzzle: PuzzleDescription | null = fetchPuzzleDescription(name);
  if (!puzzle) {
    res.status(404).send("Puzzle Not Found");
    return;
  }
  res.json(puzzle);
});

router.post("/getAllPuzzles", validateLoginToken, async (req: Request, res: Response) => {
  res.json(fetchAllPuzzleData());
});

// used to submit puzzle and awards points if correct
router.post("/submitPuzzle", validateLoginToken, async (req: Request, res: Response) => {
  const name: string = req.body.name;
  const answer: string = req.body.answer;

  // verify correct input parameters
  if (!name || !answer) {
    res.status(400).send("Missing Parameters");
    return;
  }

  // fetch user from token
  const userData = fetchLoginToken(req.cookies["LoginToken"])?.data as unknown as User;
  const user = await fetchUser(userData.username);
  if (!user) {
    res.status(404).send("User Not Found");
    return;
  }
  if (user.completed_puzzles[name]) {
    res.json(new PuzzleSubmitResult(true, false));
    return;
  }

  // ? May not be needed due to typescript consistency
  // check if token contains user
  // if (!user) {
  //   res.status(404).send("Missing User From Token");
  //   return;
  // }

  // verify puzzle exists
  const puzzle = fetchPuzzle(name);
  if (!puzzle) {
    res.status(404).send("Puzzle Not Found");
    return;
  }

  // process submission then send result back
  if (puzzle.answer === answer) {
    const result = onPuzzleCorrect(user.username, puzzle.point_value, puzzle.name);
    if (!result) {
      res.sendStatus(500);
      return;
    }

    res.json(new PuzzleSubmitResult(false, true));
    return;
  } else {
    res.json(new PuzzleSubmitResult(false, false));
    return;
  }
});

//
