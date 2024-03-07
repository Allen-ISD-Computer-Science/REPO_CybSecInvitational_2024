import * as path from "path";
import express, { Request, Response, Router } from "express";
import { Round, currentRound, startRound } from "./roundApi";
import { fetchScoreboard } from "./mongoApi";

export class ScenarioRoundGroup {
  name: string;
  priority: number;
  permissions: string;
  readonly default: boolean;

  constructor(name: string, priority: number = 0, permissions: string = "") {
    // default groups cannot be removed
    if (ScenarioRoundState.default_groups[name]) {
      this.default = true;
    } else {
      this.default = false;
    }

    this.name = name;
    this.priority = priority;
    this.permissions = permissions;
  }
}

export class ScenarioRoundUser {
  username: string;
  password: string;
  groups: { [name: string]: ScenarioRoundGroup };

  constructor(state: ScenarioRoundState, username: string, password: string) {
    this.username = username;
    this.password = password;
    this.groups = { user: state.groups.user };
  }
}

export class ScenarioRoundState {
  readonly username: string; // refers to contestant's username (not part of scenario)
  static readonly default_groups: { [name: string]: boolean } = {
    user: true,
    admin: true,
  };

  readonly groups: { [name: string]: ScenarioRoundGroup } = {
    user: new ScenarioRoundGroup("user", 0, "d---"),
  };

  readonly status = {
    solar_panel: true,
    truss_integrity: true,
    docking_port: true,
    life_support: true,
    communications: true,
  };

  // default state on round start
  readonly users: { [username: string]: ScenarioRoundUser } = {
    ryan: new ScenarioRoundUser(this, "ryan", "123456790"),
  };

  constructor(username: string) {
    this.username = username;
  }
}

export class ScenarioRound extends Round {
  type: "ScenarioRound";

  state: { [username: string]: ScenarioRoundState } = {};

  private static _onEnd() {
    console.log("Puzzle Round Ended");
  }

  constructor(duration: number, id: string, divisions: string[]) {
    let divisionsObj: { [division: string]: boolean } = {};
    divisions.forEach((val) => {
      divisionsObj[val] = true;
    });

    super(duration, "ScenarioRound", id, divisionsObj, ScenarioRound._onEnd);
    this.type = "ScenarioRound"; // ensure the type of round
  }

  async init(): Promise<boolean> {
    const scoreboard = await fetchScoreboard();
    if (!scoreboard) {
      return false;
    }

    scoreboard.forEach((member) => {
      this.state[member.username] = new ScenarioRoundState(member.username);
    });
    return true;
  }

  getUserState(username: string): ScenarioRoundState | null {
    return this.state[username];
  }
}

// * Methods
export function startScenarioRound(id: string, divisions: string[], duration: number = config.puzzle_round_duration): boolean {
  let round = new ScenarioRound(duration, id, divisions);
  return startRound(round);
}

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
