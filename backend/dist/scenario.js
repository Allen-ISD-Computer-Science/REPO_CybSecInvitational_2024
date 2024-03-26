"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolarPanelService = exports.PanelSection = exports.verifyScenarioRound = exports.verifyScenarioRoundMiddleware = exports.router = exports.startScenarioRound = exports.ScenarioRound = exports.ScenarioRoundState = exports.UserService = exports.applyEnvelopeFloat = exports.applyEnvelope = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const roundApi_1 = require("./roundApi");
const mongoApi_1 = require("./mongoApi");
const loginApi_1 = require("./loginApi");
const config = require("../config.json");
class Service {
    constructor(onUpdate) {
        this._onUpdate = onUpdate;
        this.active = true;
        this.updateService();
    }
    updateService() {
        this._onUpdate(this);
    }
}
const applyEnvelope = (a, e) => a + Math.floor(Math.random() - 0.5) * e;
exports.applyEnvelope = applyEnvelope;
const applyEnvelopeFloat = (a, e) => a + (Math.random() - 0.5) * e;
exports.applyEnvelopeFloat = applyEnvelopeFloat;
class UserService extends Service {
    static updateService() { }
    constructor() {
        super(UserService.updateService);
    }
}
exports.UserService = UserService;
class ScenarioRoundState {
    update() {
        for (let name in this.services) {
            let service = this.services[name];
            service._onUpdate();
        }
    }
    constructor() {
        this.energy = 100;
        this.supply = 100;
        this.maxEnergy = 500;
        this.services = {
            solar_panels: new SolarPanelService(),
        };
    }
}
exports.ScenarioRoundState = ScenarioRoundState;
class ScenarioRound extends roundApi_1.Round {
    static _onEnd() {
        if (!roundApi_1.currentRound || (roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) != "BattleRound")
            return;
        let round = roundApi_1.currentRound;
        clearInterval(round.updateInterval);
        console.log("Puzzle Round Ended");
    }
    constructor(duration, id, divisions) {
        let divisionsObj = {};
        divisions.forEach((val) => {
            divisionsObj[val] = true;
        });
        super(duration, "ScenarioRound", id, divisionsObj, ScenarioRound._onEnd);
        this.state = {};
        this.updateInterval = setInterval(() => {
            for (let username in this.state) {
                let userState = this.state[username];
                userState.update();
            }
        }, 5000);
        this.type = "ScenarioRound"; // ensure the type of round
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const scoreboard = yield (0, mongoApi_1.fetchScoreboard)();
            if (!scoreboard) {
                return false;
            }
            scoreboard.forEach((member) => {
                this.state[member.username] = new ScenarioRoundState();
                // console.log(JSON.stringify(this.state[member.username], null, 2));
            });
            return true;
        });
    }
    getUserState(username) {
        return this.state[username];
    }
}
exports.ScenarioRound = ScenarioRound;
// * Methods
function startScenarioRound(id, divisions, duration = config.puzzle_round_duration) {
    let round = new ScenarioRound(duration, id, divisions);
    round.init();
    return (0, roundApi_1.startRound)(round);
}
exports.startScenarioRound = startScenarioRound;
// * Routes
exports.router = express_1.default.Router();
// router middleware
function verifyScenarioRoundMiddleware(req, res, next) {
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) !== "ScenarioRound") {
        res.redirect("home");
        return;
    }
    next();
}
exports.verifyScenarioRoundMiddleware = verifyScenarioRoundMiddleware;
// sends status instead of redirecting
function verifyScenarioRound(req, res, next) {
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) !== "ScenarioRound") {
        res.status(403).send("Scenario Round Not Started");
        return;
    }
    next();
}
exports.verifyScenarioRound = verifyScenarioRound;
exports.router.get("/scenario", loginApi_1.validateLoginToken, verifyScenarioRoundMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/scenario.html"));
});
//#region solarPanelService
class PanelSection {
    constructor(status = 0) {
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
    changeStatus(status) {
        this.status = status;
        if (status == 1) {
            this.active = true;
        }
        this.active = false;
    }
    boot() {
        if (this.status != 0)
            return false;
        this.changeStatus(4);
        setTimeout(() => {
            this.changeStatus(1);
        }, (0, exports.applyEnvelopeFloat)(PanelSection.defaultBootTime, PanelSection.bootTimeEnvelope));
        return true;
    }
    repair() {
        if (this.status == 3 || this.status == 4)
            return false;
        if (this.status == 2) {
            this.changeStatus(3);
            setTimeout(() => {
                this.changeStatus(0);
            }, (0, exports.applyEnvelopeFloat)(PanelSection.defaultRepairTime, PanelSection.repairTimeEnvelope));
            return true;
        }
        else {
            return false;
        }
    }
}
exports.PanelSection = PanelSection;
PanelSection.defaultRepairTime = 15000;
PanelSection.repairTimeEnvelope = 4000;
PanelSection.defaultBootTime = 3000;
PanelSection.bootTimeEnvelope = 1000;
class SolarPanelService extends Service {
    static updateService() {
        this.active = true;
        for (let groupName in this.groups) {
            let group = this.groups[groupName];
            for (let id in group) {
                let panel = group[id];
                if (panel.getStatus() != 1) {
                    this.active = false;
                    return;
                }
            }
        }
    }
    fetchPanel(groupName, id) {
        return this.groups[groupName][id];
    }
    rebootPanel(groupName, id) {
        let panel = this.fetchPanel(groupName, id);
        if (!panel)
            return false;
        return panel.boot();
    }
    repairPanel(groupName, id) {
        let panel = this.fetchPanel(groupName, id);
        if (!panel)
            return false;
        return panel.repair();
    }
    getStatus(groupName, id) {
        let panel = this.fetchPanel(groupName, id);
        if (!panel)
            return null;
        return panel.getStatus();
    }
    getReport() {
        let report = {};
        for (let groupName in this.groups) {
            let group = this.groups[groupName];
            report[groupName] = {};
            for (let id in group) {
                let panel = group[id];
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
exports.SolarPanelService = SolarPanelService;
const solarpanelsServiceRouter = express_1.default.Router();
solarpanelsServiceRouter.post("/reboot", (req, res) => {
    const token = (0, loginApi_1.fetchLoginTokenFromRequest)(req);
    const round = roundApi_1.currentRound;
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
    const result = state.services.solar_panels.rebootPanel(groupName, panelId);
    res.json({ success: result });
});
solarpanelsServiceRouter.post("/repair", (req, res) => {
    const token = (0, loginApi_1.fetchLoginTokenFromRequest)(req);
    const round = roundApi_1.currentRound;
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
    const result = state.services.solar_panels.repairPanel(groupName, panelId);
    res.json({ success: result });
});
solarpanelsServiceRouter.post("/status", (req, res) => {
    const token = (0, loginApi_1.fetchLoginTokenFromRequest)(req);
    const round = roundApi_1.currentRound;
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
    const result = state.services.solar_panels.getStatus(groupName, panelId);
    res.json({ status: result });
});
solarpanelsServiceRouter.post("/report", (req, res) => {
    const token = (0, loginApi_1.fetchLoginTokenFromRequest)(req);
    const round = roundApi_1.currentRound;
    if (!token || !round) {
        res.sendStatus(500);
        return;
    }
    const state = round.getUserState(token.data.username);
    if (!state) {
        res.status(403).send("Not Part Of Scenario Round");
        return;
    }
    const result = state.services.solar_panels.getReport();
    res.json(result);
});
exports.router.use("/scenario/service/solarpanels", loginApi_1.validateLoginTokenPost, verifyScenarioRound, solarpanelsServiceRouter);
//#endregion
//#region RepairService
class Queue {
    constructor(length) {
        this.length = length;
        this.line = new Array(length).fill(null);
    }
    swap(a, b) {
        const clampA = Math.min(Math.max(a, 0), this.line.length - 1);
        const clampB = Math.min(Math.max(a, 0), this.line.length - 1);
        const temp = this.line[a];
        this.line[a] = this.line[b];
        this.line[b] = temp;
    }
    push(item) {
        for (let i in this.line) {
            const value = this.line[i];
            if (!value) {
                this.line[i] = item;
                return true;
            }
        }
        return false;
    }
    pop() {
        const value = this.line[0];
        for (let i = 1; i < this.line.length; i++) {
            this.line[i - 1] = this.line[i];
        }
        this.line[this.line.length - 1] = null;
        return value;
    }
}
class RepairOperation {
    constructor(duration, onStart = () => { }, onSuccess = () => { }, onCancel = () => { }) {
        this.started = false;
        this.closed = false;
        this._timeout = null;
        this.duration = duration;
        this.onStart = onStart;
        this.onSuccess = onSuccess;
        this.onCancel = onCancel;
        this.startTime = Date.now();
    }
    start() {
        this.started = true;
        this.onStart();
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
}
class RepairService extends Service {
    static updateService() {
        for (let i in this.queues) {
            const queue = this.queues[i];
            const firstOperation = queue.line[0];
            if (firstOperation && !firstOperation.started) {
                firstOperation.start();
            }
        }
    }
    constructor() {
        super(RepairService.updateService);
        this.queues = {};
        for (let i = 0; i < RepairService.default_queue_count; i++) {
            this.queues[i.toString()] = new Queue(RepairService.default_queue_limit);
        }
    }
    addOperation(id, duration, onStart = () => { }, onSuccess = () => { }, onCancel = () => { }) {
        const queue = this.queues[id];
        if (!queue) {
            return false;
        }
        const operation = new RepairOperation(duration, onStart, () => {
            queue.pop();
            onSuccess();
            this.updateService();
        }, onCancel);
        const result = queue.push(operation);
        this.updateService();
        return result;
    }
    cancelOperation(id) {
        console.log("cancelling operation");
        const queue = this.queues[id];
        if (!queue) {
            return;
        }
        const operation = queue.pop();
        if (!operation) {
            return;
        }
        operation.cancel();
        this.updateService();
    }
}
RepairService.default_queue_count = 3;
RepairService.default_queue_limit = 5;
const a = new RepairService();
a.addOperation("0", 10000, () => {
    console.log("starting operation");
}, () => {
    console.log("operation succeeded");
}, () => {
    console.log("canceling operation");
});
a.addOperation("0", 10000, () => {
    console.log("starting operation");
}, () => {
    console.log("operation succeeded");
}, () => {
    console.log("canceling operation");
});
a.addOperation("0", 10000, () => {
    console.log("starting operation");
}, () => {
    console.log("operation succeeded");
}, () => {
    console.log("canceling operation");
});
setInterval(() => {
    console.log(a.queues["0"]);
}, 1000);
setTimeout(() => {
    a.cancelOperation("0");
}, 3000);
setTimeout(() => {
    a.cancelOperation("0");
}, 2000);
setTimeout(() => {
    a.cancelOperation("0");
}, 1000);
//#endregion
