import * as path from "path";
import express, { Request, Response, Router } from "express";
import { Round, currentRound, startRound } from "./roundApi";
import { fetchScoreboard } from "./mongoApi";
import { LoginToken, fetchLoginTokenFromRequest, validateLoginToken, validateLoginTokenPost } from "./loginApi";
import { io } from "./socketApi";
const config = require("../config.json");

const passwordValidationRegex: RegExp[] = [
  /.{8,}/, // min 8 letters,
  /[0-9]/, // numbers from 0 - 9
  /[a-z]/, // letters from a - z (lowercase)
  /[A-Z]/, // letters from A-Z (uppercase),
  /[^A-Za-z0-9]/, // special characters
];

function isPasswordSecure(password: string): boolean {
  for (let i in passwordValidationRegex) {
    const pattern = passwordValidationRegex[i];
    const isValid = pattern.test(password);
    if (!isValid) return false;
  }
  return true;
}

class Service {
  active: boolean;
  _onUpdate: Function;
  _state: ScenarioRoundState;

  constructor(state: ScenarioRoundState, onUpdate: Function) {
    this._onUpdate = onUpdate;
    this.active = true;
    this._state = state;

    this.updateService();
  }

  updateService() {
    this._onUpdate(this);
  }
}

export const applyEnvelope = (a: number, e: number) => a + Math.floor(Math.random() - 0.5) * e;
export const applyEnvelopeFloat = (a: number, e: number) => a + (Math.random() - 0.5) * e;

export class ScenarioRoundState {
  energy: number = 100;
  supply: number = 100;

  readonly maxEnergy: number = 500;

  readonly services: {
    [name: string]: Service;
    ["solarpanels"]: SolarPanelService;
    ["repair"]: RepairService;
    ["user"]: UserService;
  };

  update() {
    for (let name in this.services) {
      let service = this.services[name];
      service._onUpdate();
    }
  }

  constructor() {
    this.services = {
      solarpanels: new SolarPanelService(this),
      repair: new RepairService(this),
      user: new UserService(this),
    };
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
      this.state[member.username] = new ScenarioRoundState();
      // console.log(JSON.stringify(this.state[member.username], null, 2));
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
  round.init();
  return startRound(round);
}

// * Routes
export const router: Router = express.Router();

// router middleware
export function verifyScenarioRoundMiddleware(req: Request, res: Response, next: Function) {
  if (currentRound?.type !== "ScenarioRound") {
    res.redirect("home");
    return;
  }

  next();
}

// sends status instead of redirecting
export function verifyScenarioRound(req: Request, res: Response, next: Function) {
  if (currentRound?.type !== "ScenarioRound") {
    res.status(403).send("Scenario Round Not Started");
    return;
  }

  next();
}

router.get("/scenario", validateLoginToken, verifyScenarioRoundMiddleware, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/scenario.html"));
});

//#region solarPanelService
export class PanelSection {
  static readonly defaultRepairTime = 15000;
  static readonly repairTimeEnvelope = 4000;

  static readonly defaultBootTime = 3000;
  static readonly bootTimeEnvelope = 1000;

  _inQueue: boolean = false;
  private active: boolean;
  private status: 0 | 1 | 2 | 3 | 4; // 0: idle, 1: working, 2: damaged, 3: repairing, 4: booting
  private _state: ScenarioRoundState;

  constructor(state: ScenarioRoundState, status: 0 | 1 | 2 | 3 = 0) {
    this._state = state;
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

    if (this.status == 2 && !this._inQueue) {
      const result = this._state.services.repair.addOperation(
        "0",
        "PanelSection",
        30000,
        () => {
          this._inQueue = false;
          this.changeStatus(3);
        },
        () => {
          this._inQueue = false;
          this.changeStatus(0);
        },
        () => {
          this._inQueue = false;
          this.changeStatus(2);
        }
      );
      if (result) {
        this._inQueue = true;
      }
      return result;
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
    const group = this.groups[groupName];
    if (!group) {
      return null;
    }
    const panel = group[id];
    if (!panel) {
      return null;
    }
    return panel;
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

  constructor(state: ScenarioRoundState) {
    super(state, SolarPanelService.updateService);
    this.groups = {
      a: {
        1: new PanelSection(this._state, 1),
        2: new PanelSection(this._state, 1),
        3: new PanelSection(this._state, 1),
        4: new PanelSection(this._state, 1),
        5: new PanelSection(this._state, 1),
      },
      b: {
        1: new PanelSection(this._state, 0),
        2: new PanelSection(this._state, 0),
        3: new PanelSection(this._state, 0),
        4: new PanelSection(this._state, 0),
        5: new PanelSection(this._state, 0),
      },
      c: {
        1: new PanelSection(this._state, 1),
        2: new PanelSection(this._state, 1),
        3: new PanelSection(this._state, 2),
        4: new PanelSection(this._state, 2),
        5: new PanelSection(this._state, 1),
      },
    };
  }
}

const solarpanelsServiceRouter = express.Router();

solarpanelsServiceRouter.post("/reboot", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupName = req.body.groupName;
  const panelId = req.body.panelId;

  if (!groupName || !panelId) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.solarpanels.rebootPanel(groupName, panelId);
  res.json({ success: result });
});

solarpanelsServiceRouter.post("/repair", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupName = req.body.groupName;
  const panelId = req.body.panelId;

  if (!groupName || !panelId) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.solarpanels.repairPanel(groupName, panelId);
  res.json({ success: result });
});

solarpanelsServiceRouter.post("/status", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupName = req.body.groupName;
  const panelId = req.body.panelId;

  if (!groupName || !panelId) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.solarpanels.getStatus(groupName, panelId);
  res.json({ status: result });
});

solarpanelsServiceRouter.post("/report", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const result = state.services.solarpanels.getReport();
  res.json(result);
});

router.use("/scenario/service/solarpanels", validateLoginTokenPost, verifyScenarioRound, solarpanelsServiceRouter);
//#endregion

//#region RepairService

class Queue<T> {
  readonly line: (T | null)[];
  readonly length: number;

  constructor(length: number) {
    this.length = length;
    this.line = new Array<T | null>(length).fill(null);
  }

  swap(a: number, b: number) {
    const clampA = Math.min(Math.max(a, 0), this.line.length - 1);
    const clampB = Math.min(Math.max(a, 0), this.line.length - 1);
    const temp = this.line[a];
    this.line[a] = this.line[b];
    this.line[b] = temp;
  }

  push(item: T): boolean {
    for (let i in this.line) {
      const value = this.line[i];
      if (!value) {
        this.line[i] = item;
        return true;
      }
    }
    return false;
  }

  pop(): T | null {
    const value = this.line[0];
    for (let i = 1; i < this.line.length; i++) {
      this.line[i - 1] = this.line[i];
    }
    this.line[this.line.length - 1] = null;
    return value;
  }
}

class RepairOperation {
  readonly label: string;
  started: boolean = false;
  closed: boolean = false;
  _timeout: NodeJS.Timeout | null = null;
  readonly duration: number;
  readonly onStart: Function;
  readonly onSuccess: Function;
  readonly onCancel: Function;
  startTime: number | null;

  constructor(label: string, duration: number, onStart: Function = () => {}, onSuccess: Function = () => {}, onCancel: Function = () => {}) {
    this.label = label;
    this.duration = duration;
    this.onStart = onStart;
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;
    this.startTime = null;
  }

  start() {
    this.started = true;
    this.onStart();
    this.startTime = Date.now();
    this._timeout = setTimeout(() => {
      this.onSuccess();
      this.closed = true;
    }, this.duration);
  }

  cancel() {
    this.started = false;
    if (this._timeout) {
      clearTimeout(this._timeout);
    }
    this.onCancel();
  }

  report() {
    return {
      label: this.label,
      startTime: this.startTime,
      duration: this.duration,
      started: this.started,
    };
  }
}

class RepairService extends Service {
  static readonly default_queue_count: number = 3;
  static readonly default_queue_limit: number = 5;

  // active when at least one repair operation is in any queue
  static updateService(this: RepairService) {
    this.active = false;

    for (let i in this.queues) {
      const queue = this.queues[i];
      const firstOperation = queue.line[0];
      if (firstOperation) {
        this.active = true;

        if (!firstOperation.started) {
          firstOperation.start();
        }
      }
    }
  }

  queues: { [id: string]: Queue<RepairOperation> };

  constructor(state: ScenarioRoundState) {
    super(state, RepairService.updateService);
    this.queues = {};
    for (let i = 0; i < RepairService.default_queue_count; i++) {
      this.queues[i.toString()] = new Queue(RepairService.default_queue_limit);
    }
  }

  addOperation(id: string, label: string, duration: number, onStart: Function = () => {}, onSuccess: Function = () => {}, onCancel: Function = () => {}): boolean {
    const queue = this.queues[id];
    if (!queue) {
      return false;
    }

    const operation = new RepairOperation(
      label,
      duration,
      onStart,
      () => {
        queue.pop();
        onSuccess();
        this.updateService();
      },
      onCancel
    );
    const result = queue.push(operation);
    this.updateService();
    return result;
  }

  cancelOperation(id: string) {
    console.log("cancelling operation");
    const queue = this.queues[id];
    if (!queue) {
      return;
    }

    const operation: RepairOperation | null = queue.pop();
    if (!operation) {
      return;
    }

    operation.cancel();
    this.updateService();
  }

  report() {
    let report: { [id: string]: Array<any> } = {};
    for (let i in this.queues) {
      const queue = this.queues[i];
      const queueReport = [];
      for (let k in queue.line) {
        const value = queue.line[k];
        queueReport.push(value?.report());
      }
      report[i] = queueReport;
    }

    return report;
  }
}

const repairServiceRouter = express.Router();

repairServiceRouter.post("/report", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const result = state.services.repair.report();
  console.log(result);
  res.json(result);
});

router.use("/scenario/service/repair", validateLoginTokenPost, verifyScenarioRound, repairServiceRouter);

//#endregion

//#region User Service

interface ScenarioUserPermissions {
  [name: string]: boolean;
  isAdmin: boolean;
  canRead: boolean;
  canWrite: boolean;
  canModServiceSolarPanels: boolean;
  canModServicePorts: boolean;
  canModServiceLifeSupport: boolean;
  canModServiceComms: boolean;
  canModServiceTruss: boolean;
  canModServiceUser: boolean;
  canModServiceRepair: boolean;
}

class ScenarioUser {
  username: string;
  private password: string;
  permissions: ScenarioUserPermissions;

  // internal properties
  _unsafe: boolean;
  _malicious: boolean;
  _passwordChanged: boolean = false;

  constructor(
    username: string,
    password: string,
    permissions: ScenarioUserPermissions = {
      isAdmin: false,
      canRead: false,
      canWrite: false,
      canModServiceSolarPanels: false,
      canModServicePorts: false,
      canModServiceLifeSupport: false,
      canModServiceComms: false,
      canModServiceTruss: false,
      canModServiceUser: false,
      canModServiceRepair: false,
    },
    malicious: boolean = false
  ) {
    this.username = username;
    this.password = password;
    this.permissions = permissions;
    this._malicious = malicious;
    this._unsafe = !isPasswordSecure(this.password);
  }

  getPassword() {
    return this.password;
  }

  changePassword(password: string) {
    this.password = password;
    this._passwordChanged = true;
  }

  changePermission(name: string, value: boolean): boolean {
    if (!(name in this.permissions)) return false;
    this.permissions[name] = value;
    return true;
  }

  report() {
    let report = {
      username: this.username,
      password: this.password,
      permissions: this.permissions,
    };
    return report;
  }
}

class ScenarioGroup {
  name: string;
  users: { [username: string]: true };
  permissions: ScenarioUserPermissions;

  // internal properties
  _protected: boolean;

  constructor(
    name: string,
    users: ScenarioUser[] = [],
    permissions: ScenarioUserPermissions = {
      isAdmin: false,
      canRead: false,
      canWrite: false,
      canModServiceSolarPanels: false,
      canModServicePorts: false,
      canModServiceLifeSupport: false,
      canModServiceComms: false,
      canModServiceTruss: false,
      canModServiceUser: false,
      canModServiceRepair: false,
    },
    isProtected: boolean = false
  ) {
    this.name = name;
    this.users = {};
    this.permissions = permissions;

    users.forEach((element) => {
      this.addUser(element);
    });
    this._protected = isProtected;
  }

  changePermission(name: string, value: boolean): boolean {
    if (!(name in this.permissions)) return false;
    this.permissions[name] = value;
    return true;
  }

  findUser(username: string): true | undefined {
    return this.users[username];
  }

  // returns false if user already exists
  addUser(user: ScenarioUser): boolean {
    if (this.findUser(user.username)) {
      return false;
    }
    this.users[user.username] = true;
    return true;
  }

  removeUser(username: string): boolean {
    const user = this.findUser(username);
    if (!user) return false;
    delete this.users[username];
    return true;
  }

  report() {
    let reportUsers: any[] = [];
    const report = {
      name: this.name,
      users: Object.keys(this.users),
      permissions: this.permissions,
    };
    return report;
  }
}

//#region UserService Interfaces
interface AddGroupResult {
  alreadyExists: boolean;
  success: boolean;
}

interface RemoveGroupResult {
  notFound: boolean;
  isProtected: boolean;
  success: boolean;
}

interface AddUserResult {
  alreadyExists: boolean;
  success: boolean;
}

interface RemoveUserResult {
  notFound: boolean;
  success: boolean;
}

interface ChangePermissionResult {
  notFound: boolean;
  success: boolean;
}

interface UserServiceReport {
  notFound: boolean;
  report?: {} | undefined;
}
//#endregion

class UserService extends Service {
  static updateService(this: UserService) {
    this.active = true;

    // check password security
    for (let i in this.users) {
      const user = this.users[i];
      if (!user._passwordChanged) continue;
      user._passwordChanged = false;
      if (isPasswordSecure(user.getPassword())) {
        user._unsafe = false;
      } else {
        user._unsafe = true;
        this.active = false;
      }
    }
  }

  users: { [username: string]: ScenarioUser };
  groups: { [name: string]: ScenarioGroup };

  constructor(state: ScenarioRoundState) {
    super(state, UserService.updateService);

    const user1 = new ScenarioUser("Admin", "1234password");
    const user2 = new ScenarioUser("Abby", "passphrase");
    const user3 = new ScenarioUser("Bill", "secret101");
    const user4 = new ScenarioUser("Johnson", "");

    this.users = {
      [user1.username]: user1,
      [user2.username]: user2,
      [user3.username]: user3,
      [user4.username]: user4,
    };

    const adminGroup = new ScenarioGroup("Admin", [user1], undefined, true);
    const maintenanceGroup = new ScenarioGroup("Maintenance", [user2, user3], undefined, true);
    const usersGroup = new ScenarioGroup("Users", [user1, user2, user3, user4], undefined, true);

    this.groups = {
      [adminGroup.name]: adminGroup,
      [maintenanceGroup.name]: maintenanceGroup,
      [usersGroup.name]: usersGroup,
    };
  }

  // User Management
  addUser(username: string, password: string): AddUserResult {
    if (this.users[username]) return { alreadyExists: true, success: false };
    this.users[username] = new ScenarioUser(username, password);
    return { alreadyExists: false, success: true };
  }

  removeUser(username: string): RemoveUserResult {
    const user = this.users[username];
    if (!user) return { notFound: true, success: false };
    for (let i in this.groups) {
      const group = this.groups[i];
      group.removeUser(username);
    }
    delete this.users[user.username];
    console.log(user);
    return { notFound: false, success: true };
  }

  changeUserPermission(username: string, permName: string, permValue: boolean): ChangePermissionResult {
    const user = this.users[username];
    if (!user) return { notFound: true, success: false };
    return { notFound: false, success: user.changePermission(permName, permValue) };
  }

  reportUser(username: string): UserServiceReport {
    const user = this.users[username];
    if (!user) return { notFound: true };
    return { notFound: false, report: user.report() };
  }

  reportAllUsers(): string[] {
    return Object.keys(this.users);
  }

  // Group Management
  addGroup(name: string): AddGroupResult {
    if (this.groups[name]) return { alreadyExists: true, success: false };
    this.groups[name] = new ScenarioGroup(name, undefined, undefined, false);
    return { alreadyExists: false, success: false };
  }

  removeGroup(name: string): RemoveGroupResult {
    const group = this.groups[name];
    if (!group) return { notFound: true, isProtected: false, success: false };
    if (group._protected) return { notFound: false, isProtected: true, success: false };
    delete this.groups[name];
    return { notFound: false, isProtected: false, success: true };
  }

  changeGroupPermission(groupname: string, permName: string, permValue: boolean): ChangePermissionResult {
    const group = this.groups[groupname];
    if (!group) return { notFound: true, success: false };
    return { notFound: false, success: group.changePermission(permName, permValue) };
  }

  reportGroup(name: string): UserServiceReport {
    const group = this.groups[name];
    if (!group) return { notFound: true };

    return { notFound: false, report: group.report() };
  }

  reportAllGroups(): { name: string; users: string[] }[] {
    const result = [];
    for (let i in this.groups) {
      const group = this.groups[i];
      result.push({
        name: group.name,
        users: Object.keys(group.users),
      });
    }
    return result;
  }
}

const userServiceRouter = express.Router();

userServiceRouter.post("/addUser", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const username = req.body.username;
  const password = req.body.password;
  if (!username || !password) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.user.addUser(username, password);
  if (result.alreadyExists) {
    res.status(400).send("User Already Exists");
  } else if (result.success) {
    res.sendStatus(200);
  } else {
    res.status(400).send("Failed Operation");
  }
});

userServiceRouter.post("/removeUser", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const username = req.body.username;
  if (!username) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.user.removeUser(username);
  if (result.notFound) {
    res.status(400).send("User Not Found");
  } else if (result.success) {
    res.sendStatus(200);
  } else {
    res.status(400).send("Failed Operation");
  }
});

userServiceRouter.post("/changeUserPermission", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const username = req.body.username;
  const permName = req.body.permName;
  const value = Boolean(req.body.value);
  if (!username || !permName || value == undefined) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.user.changeUserPermission(username, permName, value);
  if (result.notFound) {
    res.status(400).send("Permission Not Found");
  } else if (result.success) {
    res.sendStatus(200);
  } else {
    res.status(400).send("Failed Operation");
  }
});

userServiceRouter.post("/groupReportAll", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  res.json(state.services.user.reportAllGroups());
});

userServiceRouter.post("/groupReport", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupname: string = req.body.username;
  if (!groupname) {
    res.status(400).send("Missing Arguments");
    return;
  }

  const result = state.services.user.reportGroup(groupname);
  if (result.notFound) {
    res.status(400).send("Group Doesn't Exist");
    return;
  }

  res.json(result.report);
});

//

userServiceRouter.post("/addGroup", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupname = req.body.groupname;
  if (!groupname) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.user.addGroup(groupname);
  if (result.alreadyExists) {
    res.status(400).send("Group Already Exists");
  } else if (result.success) {
    res.sendStatus(200);
  } else {
    res.status(400).send("Failed Operation");
  }
});

userServiceRouter.post("/removeGroup", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupname = req.body.groupname;
  if (!groupname) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.user.removeGroup(groupname);
  if (result.isProtected) {
    res.status(400).send("Cannot Remove Protected Groups");
    return;
  } else if (result.notFound) {
    res.status(400).send("Group Not Found");
  } else if (result.success) {
    res.sendStatus(200);
  } else {
    res.status(400).send("Failed Operation");
  }
});

userServiceRouter.post("/changeGroupPermission", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const groupname = req.body.groupname;
  const permName = req.body.permName;
  const value = Boolean(req.body.value);
  if (!groupname || !permName || value == undefined) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const result = state.services.user.changeGroupPermission(groupname, permName, value);
  if (result.notFound) {
    res.status(400).send("Permission Not Found");
  } else if (result.success) {
    res.sendStatus(200);
  } else {
    res.status(400).send("Failed Operation");
  }
});

userServiceRouter.post("/userReportAll", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  res.json(state.services.user.reportAllUsers());
});

userServiceRouter.post("/userReport", (req: Request, res: Response) => {
  const token = fetchLoginTokenFromRequest(req) as unknown as LoginToken;
  const round = currentRound as unknown as ScenarioRound;
  if (!token || !round) {
    res.sendStatus(500);
    return;
  }

  const state = round.getUserState(token.data.username);
  if (!state) {
    res.status(403).send("Not Part Of Scenario Round");
    return;
  }

  const username: string = req.body.username;
  if (!username) {
    res.status(400).send("Missing Arguments");
    return;
  }

  const result = state.services.user.reportUser(username);
  if (result.notFound) {
    res.status(400).send("User Doesn't Exist");
    return;
  }

  res.json(result.report);
});

router.use("/scenario/service/repair", validateLoginTokenPost, verifyScenarioRound, userServiceRouter);

//#endregion
