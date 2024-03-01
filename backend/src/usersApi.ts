import * as path from "path";
import express, { Request, Response, Router } from "express";

import { fetchUser } from "./mongoApi";
import { fetchLoginToken, validateLoginToken } from "./loginApi";

// * Methods
// fetches specific user, includes ALL data present in the db

// * Routes
export const router: Router = express.Router();

router.post("/getUser", validateLoginToken, async (req: Request, res: Response) => {
  // fetch user from token
  const user = fetchLoginToken(req.cookies["LoginToken"])?.data as unknown as User;
  if (!user) {
    res.status(404).send("User Not Found");
  }
  const userData = (await fetchUser(user.username)) as unknown as { [_: string]: any };

  delete userData._id;
  delete userData.password;

  res.json(userData);
});
