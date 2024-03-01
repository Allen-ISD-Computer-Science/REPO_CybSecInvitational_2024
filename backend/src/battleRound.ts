import { Request, Response } from "express";
import { currentRound } from "roundApi";

export function verifyBattleRound(req: Request, res: Response, next: Function) {
  if (currentRound?.type != "BattleRound") {
    res.redirect("home");
  }
  next();
}
