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
exports.verifyScenarioRound = exports.verifyScenarioRoundMiddleware = exports.router = exports.startScenarioRound = exports.ScenarioRound = exports.ScenarioRoundState = exports.UserService = exports.SolarPanelService = exports.PanelSection = exports.applyEnvelopeFloat = exports.applyEnvelope = exports.ScenarioRoundUser = exports.ScenarioRoundGroup = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const roundApi_1 = require("./roundApi");
const mongoApi_1 = require("./mongoApi");
const loginApi_1 = require("./loginApi");
const config = require("../config.json");
class ScenarioRoundGroup {
    constructor(name, priority = 0, permissions = "") {
        // default groups cannot be removed
        if (ScenarioRoundState.default_groups[name]) {
            this.default = true;
        }
        else {
            this.default = false;
        }
        this.name = name;
        this.priority = priority;
        this.permissions = permissions;
    }
}
exports.ScenarioRoundGroup = ScenarioRoundGroup;
class ScenarioRoundUser {
    constructor(state, username, password) {
        this.username = username;
        this.password = password;
        this.groups = { user: state.groups.user };
    }
}
exports.ScenarioRoundUser = ScenarioRoundUser;
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
    constructor(username) {
        this.groups = {
            user: new ScenarioRoundGroup("user", 0, "d---"),
        };
        this.services = {
            solar_panels: new SolarPanelService(),
        };
        // default state on round start
        this.users = {
            ryan: new ScenarioRoundUser(this, "ryan", "123456790"),
        };
        this.username = username;
    }
}
exports.ScenarioRoundState = ScenarioRoundState;
ScenarioRoundState.default_groups = {
    user: true,
    admin: true,
};
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
                this.state[member.username] = new ScenarioRoundState(member.username);
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
exports.router.post("/service", loginApi_1.validateLoginTokenPost, verifyScenarioRoundMiddleware, (req, res) => {
    const name = req.body.name;
    const actionName = req.body.action;
    let args = req.body.args;
    // allows request to exclude args if not needed
    if (!args) {
        args = [];
    }
    if (!name || !actionName) {
        res.status(400).send("Missing Arguments");
        return;
    }
    const token = res.locals.token;
    const round = roundApi_1.currentRound; //validated by middleware
    const state = round.getUserState(token.data.username);
    if (!state) {
        res.status(403).send("Not In Scenario Round");
        return;
    }
    if (name == "solarpanels") {
        const action = solarPanelActions[actionName];
        if (!action) {
            res.status(400).send("Action Not Found");
            return;
        }
        action(res, state, ...args);
    }
    else {
        res.status(400).send("Service Not Found");
    }
});
const solarPanelActions = {
    reboot: (res, state, groupName, id) => {
        if (!groupName || !id) {
            res.status(400).send("Missing Arguments");
            return;
        }
        const panel = state.services.solar_panels.fetchPanel(groupName, id);
        if (!panel) {
            res.status(400).send("Panel Not Found");
            return;
        }
        state.services.solar_panels.rebootPanel(groupName, id);
        res.sendStatus(200);
    },
    repair: (res, state, groupName, id) => {
        if (!groupName || !id) {
            res.status(400).send("Missing Arguments");
            return;
        }
        const panel = state.services.solar_panels.fetchPanel(groupName, id);
        if (!panel) {
            res.status(400).send("Panel Not Found");
            return;
        }
        state.services.solar_panels.repairPanel(groupName, id);
        res.sendStatus(200);
    },
    status: (res, state, groupName, id) => {
        if (!groupName || !id) {
            res.status(400).send("Missing Arguments");
            return;
        }
        const panel = state.services.solar_panels.fetchPanel(groupName, id);
        if (!panel) {
            res.status(400).send("Panel Not Found");
            return;
        }
        state.services.solar_panels.getStatus(groupName, id);
        res.sendStatus(200);
    },
    report: (res, state) => {
        res.json(state.services.solar_panels.getReport());
    },
};
