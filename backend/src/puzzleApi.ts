import express, { Request, Response, Router } from "express";
import { Socket } from "socket.io";
import * as loginApi from "./loginApi";
import * as mongoApi from "./mongoApi";

export const router: Router = express.Router();

router.get("/puzzle", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.send("GET request to the homepage");
});

router.post("/puzzle", loginApi.validateLoginToken, (req: Request, res: Response) => {
  res.send("POST request to the homepage");
});

export var puzzles = [];

async function replicatePuzzles() {
  try {
    const result = await mongoApi.client
      .db(mongoApi.mainDbName)
      .collection(mongoApi.puzzlesColName)
      .find({}, { projection: { _id: 0 } })
      .toArray();
    console.log(result);
  } catch (err) {
    console.log(err);
  }
}

replicatePuzzles();
