import * as path from "path";
import express, { Request, Response, Router } from "express";
import { Token, TokenGroup } from "./loginApi";
import { addPointsToUser, fetchAdmin, markPuzzleAsCompleted, markPuzzleAsNotCompleted, setDivisionOfUser, setPointsOfUser } from "./mongoApi";
import { endCurrentRound, startBattleRound, startPuzzleRound } from "./roundApi";
import { io } from "./socketApi";

// * Module Parameters
export const loginTokenGroup = new TokenGroup(120000);

// * Methods
export async function validateLoginToken(req: Request, res: Response, next: Function) {
  const loginTokenId = req.cookies["AdminLoginToken"];
  if (!loginTokenId) {
    res.status(403).send("Unauthorized");
    return;
  }
  const token = loginTokenGroup.findTokenOfId(loginTokenId);
  if (!token) {
    res.status(403).send("Unauthorized");
    return;
  }
  res.locals.token = token;

  next();
}

const commands: { [command: string]: (tokens: string[], res: Response) => {} } = {
  ["PUZZLE_POINTS"]: async (tokens: string[], res: Response) => {
    const operator: string = tokens[1];
    const target: string = tokens[2];
    const amount: number = Number(tokens[3]);

    if (!operator || !target || !amount) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    if (operator == "ADD") {
      const result = await addPointsToUser(target, amount, "puzzle_points");
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else if (operator == "SUB") {
      const result = await addPointsToUser(target, -amount, "puzzle_points");
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else if (operator == "SET") {
      const result = await setPointsOfUser(target, amount, "puzzle_points");
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else {
      res.status(400).send("Invalid Operator");
      return;
    }
  },
  ["SCENARIO_POINTS"]: async (tokens: string[], res: Response) => {
    const operator: string = tokens[1];
    const target: string = tokens[2];
    const amount: number = Number(tokens[3]);

    if (!operator || !target || !amount) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    if (operator == "ADD") {
      const result = await addPointsToUser(target, amount, "scenario_points");
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else if (operator == "SUB") {
      const result = await addPointsToUser(target, -amount, "scenario_points");
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else if (operator == "SET") {
      const result = await setPointsOfUser(target, amount, "scenario_points");
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else {
      res.status(400).send("Invalid Operator");
      return;
    }
  },
  ["COMPLETED_PUZZLES"]: async (tokens: string[], res: Response) => {
    const operator: string = tokens[1];
    const target: string = tokens[2];
    const puzzleName: string = tokens[3];

    if (!operator || !target || !puzzleName) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    if (operator == "ADD") {
      const result = await markPuzzleAsCompleted(target, puzzleName);
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else if (operator == "SUB") {
      const result = await markPuzzleAsNotCompleted(target, puzzleName);
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else {
      res.status(400).send("Invalid Operator");
      return;
    }
  },
  ["DIVISION"]: async (tokens: string[], res: Response) => {
    const operator: string = tokens[1];
    const target: string = tokens[2];
    const division: number = Number(tokens[3]);

    if (!operator || !target || (!division && division != 0)) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    if (operator == "SET") {
      const result = await setDivisionOfUser(target, division);
      if (result) {
        res.sendStatus(200);
      } else {
        res.sendStatus(500);
      }
    } else {
      res.status(400).send("Invalid Operator");
      return;
    }
  },
  ["BATTLE_ROUND"]: async (tokens: string[], res: Response) => {
    const id = tokens[1];
    const duration = Number(tokens[2]);

    if (!id) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    let result = undefined;
    if (duration) {
      // Number() returns NaN when not a number, making sure that the function doesn't use NaN
      result = await startBattleRound(id, duration);
    } else {
      result = await startBattleRound(id);
    }
    if (result) {
      res.sendStatus(200);
    } else {
      res.sendStatus(500);
    }
  },
  ["PUZZLE_ROUND"]: async (tokens: string[], res: Response) => {
    const id = tokens[1];
    const duration = Number(tokens[2]);

    if (!id) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    let result = undefined;
    if (duration) {
      // Number() returns NaN when not a number, making sure that the function doesn't use NaN
      result = startPuzzleRound(id, duration);
    } else {
      result = startPuzzleRound(id);
    }
    if (result) {
      res.sendStatus(200);
    } else {
      res.sendStatus(500);
    }
  },
  ["ROUND"]: async (tokens: string[], res: Response) => {
    const operator: string = tokens[1];
    if (!operator) {
      res.status(400).send("Missing or Invalid Options");
      return;
    }

    if (operator == "END") {
      endCurrentRound();
      res.sendStatus(200);
    } else {
      res.status(400).send("Invalid Operator");
      return;
    }
  },
  ["ALERT"]: async (tokens: string[], res: Response) => {
    const level: number = Number(tokens[1]);
    const message: string = tokens.slice(2).join(" ");
    if (!level) {
      res.status(400).send("Invalid Alert Level");
      return;
    }

    io.emit("alert", {
      level: level,
      message: message,
    });
    res.sendStatus(200);
  },
};

async function parseCommand(command: string, res: Response) {
  const commandTokens = command.split(" ");
  const commandFunc = commands[commandTokens[0]];
  if (!commandFunc) {
    res.status(404).send("Command Not Found");
    return;
  }
  commandFunc(commandTokens, res);
}

// * Routes
export const router: Router = express.Router();

router.post("/adminCommand", validateLoginToken, async (req: Request, res: Response) => {
  const command = req.body.command;
  if (!command) {
    res.status(400).send("Missing Command");
    return;
  }
  parseCommand(command, res);
});

router.post("/adminLogin", async (req: Request, res: Response) => {
  console.log("attempting login");
  const username: string | undefined = req.body.username;
  const password: string | undefined = req.body.password;

  if (!username || !password) {
    res.status(400).send("Missing Username or Password!");
    return;
  }

  let user = await fetchAdmin(username);
  if (!user) {
    res.status(400).send("Incorrect Credentials!");
    return;
  }

  if (user.password !== password) {
    res.status(400).send("Incorrect Credentials!");
  }

  const id = loginTokenGroup.createNewToken(user);
  res.cookie("AdminLoginToken", id, { secure: true, maxAge: loginTokenGroup.duration, httpOnly: true }).redirect("admin");
});

router.get("/admin", validateLoginToken, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/admin.html"));
});

router.get("/adminLogin", (req: Request, res: Response) => {
  const loginTokenId = req.cookies["AdminLoginToken"];

  console.log(res.getHeaders());
  console.log(res.headersSent);

  if (loginTokenId && loginTokenGroup.findTokenOfId(loginTokenId)) {
    res.redirect("admin");
    console.log(res.headersSent);
    return;
  }
  console.log(res.headersSent);
  res.sendFile(path.join(__dirname, "../public/adminLogin.html"));
});

router.get("/adminLogout", validateLoginToken, (req: Request, res: Response) => {
  const loginTokenId = req.cookies["AdminLoginToken"];

  if (loginTokenId) {
    loginTokenGroup.removeToken(loginTokenId);
    res.clearCookie("AdminLoginToken");
  }

  res.redirect("adminLogin");
});
