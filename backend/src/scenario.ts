import * as path from "path";
import express, { Request, Response, Router } from "express";
import { currentRound } from "./roundApi";

// * Methods

// * Routes
export const router: Router = express.Router();

// router middleware
export function verifyScenarioRound(req: Request, res: Response, next: Function) {
  if (currentRound?.type !== "ScenarioRound") {
    res.redirect("home");
  }

  next();
}

router.get("/scenario", verifyScenarioRound, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/scenario.html"));
});
