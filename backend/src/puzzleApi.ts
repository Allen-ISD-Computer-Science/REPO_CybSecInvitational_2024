import express, { Request, Response, Router } from "express";
import { Socket } from "socket.io";
import * as loginApi from "./loginApi";
import * as mongoApi from "./mongoApi";
import * as path from "path";

export const router: Router = express.Router();

router.get("/puzzles", loginApi.validateLoginToken, (req: Request, res: Response) => {
  console.log(loginApi.loginTokenGroup.findTokenOfId(req.cookies["LoginToken"]));
  res.sendFile(path.join(__dirname, "../public/puzzles.html"));

  // res.send("GET request to the homepage");
});

router.post("/puzzle", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.send("POST request to the homepage");
});

export var puzzles: Puzzle[] = [];

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
      puzzles = result;
    }
  } catch (err) {
    console.log(err);
  }
}

replicatePuzzles();