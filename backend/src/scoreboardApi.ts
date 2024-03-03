import * as path from "path";
import express, { Request, Response, Router } from "express";

import { fetchUser } from "./mongoApi";
import { fetchLoginToken, validateLoginToken } from "./loginApi";

// * Methods
// fetches specific user, includes ALL data present in the db

// * Routes
export const router: Router = express.Router();

router.get("/scoreboard", validateLoginToken, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/scoreboard.html"));
});
