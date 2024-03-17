import * as path from "path";
import express, { Request, Response, Router } from "express";
import { Round, currentRound, startRound } from "./roundApi";
import { fetchScoreboard } from "./mongoApi";
const config = require("../config.json");

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

class Service {
  active: boolean;
  _onUpdate: Function;

  constructor(onUpdate: Function) {
    this._onUpdate = onUpdate;
    this.active = true;

    this.updateService();
  }

  updateService() {
    this._onUpdate(this);
  }
}

export const applyEnvelope = (a: number, e: number) => a + Math.floor(Math.random() - 0.5) * e;
export const applyEnvelopeFloat = (a: number, e: number) => a + (Math.random() - 0.5) * e;

export class PanelSection {
  static readonly defaultRepairTime = 15000;
  static readonly repairTimeEnvelope = 4000;

  static readonly defaultBootTime = 3000;
  static readonly bootTimeEnvelope = 1000;

  private active: boolean;
  private status: 0 | 1 | 2 | 3 | 4; // 0: idle, 1: working, 2: damaged, 3: repairing, 4: booting

  constructor(status: 0 | 1 | 2 | 3 = 0) {
    this.status = status;
    if (status == 1) {
      this.active = true;
    }
    this.active = false;
  }

  getActive() {
    return this.active;
  }

  getStatus() {
    return this.status;
  }

  changeStatus(status: 0 | 1 | 2 | 3 | 4) {
    this.status = status;
    if (status == 1) {
      this.active = true;
    }
    this.active = false;
  }

  boot(): boolean {
    if (this.status != 0) return false;
    this.changeStatus(4);
    setTimeout(() => {
      this.changeStatus(1);
    }, applyEnvelopeFloat(PanelSection.defaultBootTime, PanelSection.bootTimeEnvelope));
    return true;
  }

  repair(): boolean {
    if (this.status == 3 || this.status == 4) return false;

    if (this.status == 2) {
      this.changeStatus(3);
      setTimeout(() => {
        this.changeStatus(0);
      }, applyEnvelopeFloat(PanelSection.defaultRepairTime, PanelSection.repairTimeEnvelope));
      return true;
    } else {
      return false;
    }
  }
}

export class SolarPanelService extends Service {
  groups: { [id: string]: { [id: string]: PanelSection } };

  static updateService(this: SolarPanelService) {
    this.active = true;
    for (let groupName in this.groups) {
      let group = this.groups[groupName];
      for (let id in group) {
        let panel: PanelSection = group[id];
        if (panel.getStatus() != 1) {
          this.active = false;
          return;
        }
      }
    }
  }

  fetchPanel(groupName: string, id: string): null | PanelSection {
    return this.groups[groupName][id];
  }

  rebootPanel(groupName: string, id: string): boolean {
    let panel = this.fetchPanel(groupName, id);
    if (!panel) return false;
    return panel.boot();
  }

  repairPanel(groupName: string, id: string): boolean {
    let panel = this.fetchPanel(groupName, id);
    if (!panel) return false;
    return panel.repair();
  }

  getStatus(groupName: string, id: string): null | number {
    let panel = this.fetchPanel(groupName, id);
    if (!panel) return null;
    return panel.getStatus();
  }

  getReport() {
    let report: { [id: string]: { [id: string]: number } } = {};

    for (let groupName in this.groups) {
      let group = this.groups[groupName];
      report[groupName] = {};
      for (let id in group) {
        let panel: PanelSection = group[id];
        report[groupName][id] = panel.getStatus();
      }
    }

    return report;
  }

  constructor() {
    super(SolarPanelService.updateService);
    this.groups = {
      a: {
        1: new PanelSection(1),
        2: new PanelSection(1),
        3: new PanelSection(1),
        4: new PanelSection(1),
        5: new PanelSection(1),
      },
      b: {
        1: new PanelSection(0),
        2: new PanelSection(0),
        3: new PanelSection(0),
        4: new PanelSection(0),
        5: new PanelSection(0),
      },
      c: {
        1: new PanelSection(1),
        2: new PanelSection(1),
        3: new PanelSection(2),
        4: new PanelSection(2),
        5: new PanelSection(1),
      },
    };
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

  readonly services: { [name: string]: Service } = {
    solar_panels: new SolarPanelService(),
  };

  // default state on round start
  readonly users: { [username: string]: ScenarioRoundUser } = {
    ryan: new ScenarioRoundUser(this, "ryan", "123456790"),
  };

  update() {
    for (let name in this.services) {
      let service = this.services[name];
      service._onUpdate();
    }
  }

  constructor(username: string) {
    this.username = username;
  }
}

export class ScenarioRound extends Round {
  type: "ScenarioRound";

  state: { [username: string]: ScenarioRoundState } = {};
  updateInterval: NodeJS.Timeout = setInterval(() => {
    for (let username in this.state) {
      let userState = this.state[username];
      userState.update();
    }
  }, 5000);

  private static _onEnd() {
    if (!currentRound || currentRound?.type != "BattleRound") return;
    let round = currentRound as ScenarioRound;
    clearInterval(round.updateInterval);
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
