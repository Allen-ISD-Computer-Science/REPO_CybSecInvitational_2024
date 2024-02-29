import express, { Request, Response, Router } from "express";
import { Socket } from "socket.io";
import * as loginApi from "./loginApi";
import * as mongoApi from "./mongoApi";
import * as path from "path";

export var puzzles: { [name: string]: Puzzle } = {};
async function replicatePuzzles() {
  try {
    const result = (await mongoApi.client
      .db(mongoApi.mainDbName)
      .collection(mongoApi.puzzlesColName)
      .find({}, { projection: { _id: 0 } })
      .toArray()) as unknown as Puzzle[];

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

replicatePuzzles().then(() => {
  console.log(fetchPuzzleOnlyDescription("templatePuzzleName"));
});

export function fetchPuzzle(name: string): Puzzle | null {
  return puzzles[name];
}

export function fetchPuzzleOnlyDescription(name: string): PuzzleDescription | null {
  let puzzle = fetchPuzzle(name) as unknown as { [any: string]: any };
  if (!puzzle) return null;

  delete puzzle._id;
  delete puzzle.answer;

  return puzzle as unknown as PuzzleDescription;
}

// Routes
export const router: Router = express.Router();

router.get("/puzzles", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/puzzles.html"));
});

router.post("/getPuzzle", loginApi.validateLoginToken, async (req: Request, res: Response) => {
  const name: string = req.body.name;
  if (!name) {
    res.status(400).send("Missing Puzzle Name");
    return;
  }

  const puzzle: PuzzleDescription | null = fetchPuzzleOnlyDescription(name);
  if (!puzzle) {
    res.status(404).send("Puzzle Not Found");
    return;
  }
  res.json(puzzle);
});

router.post("/submitPuzzle", loginApi.validateLoginToken, async (req: Request, res: Response) => {
  const name: string = req.body.name;
  const answer: string = req.body.answer;

  if (!name || !answer) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const user = loginApi.fetchLoginToken(req.cookies["LoginToken"])?.data;
  if (!user) {
    res.status(404).send("Missing User");
    return;
  }
});
