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
exports.verifyScenarioRound = exports.router = exports.startScenarioRound = exports.ScenarioRound = exports.ScenarioRoundState = exports.SolarPanelService = exports.PanelSection = exports.applyEnvelopeFloat = exports.applyEnvelope = exports.ScenarioRoundUser = exports.ScenarioRoundGroup = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const roundApi_1 = require("./roundApi");
const mongoApi_1 = require("./mongoApi");
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
        this.status = 4;
        setTimeout(() => {
            this.status = 1;
            console.log(this.status);
        }, (0, exports.applyEnvelopeFloat)(PanelSection.defaultBootTime, PanelSection.bootTimeEnvelope));
        return true;
    }
    repair() {
        if (this.status == 3 || this.status == 4)
            return false;
        if (this.status == 2) {
            this.status = 3;
            setTimeout(() => {
                this.status = 0;
                console.log(this.status);
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
    static updateService() { }
    constructor() {
        super(SolarPanelService.updateService);
        this.sections = {
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
class ScenarioRoundState {
    constructor(username) {
        this.groups = {
            user: new ScenarioRoundGroup("user", 0, "d---"),
        };
        this.status = {
            solar_panel: true,
            truss_integrity: true,
            docking_port: true,
            life_support: true,
            communications: true,
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
        console.log("Puzzle Round Ended");
    }
    constructor(duration, id, divisions) {
        let divisionsObj = {};
        divisions.forEach((val) => {
            divisionsObj[val] = true;
        });
        super(duration, "ScenarioRound", id, divisionsObj, ScenarioRound._onEnd);
        this.state = {};
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
    return (0, roundApi_1.startRound)(round);
}
exports.startScenarioRound = startScenarioRound;
// * Routes
exports.router = express_1.default.Router();
// router middleware
function verifyScenarioRound(req, res, next) {
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) !== "ScenarioRound") {
        res.redirect("home");
    }
    next();
}
exports.verifyScenarioRound = verifyScenarioRound;
exports.router.get("/scenario", verifyScenarioRound, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/scenario.html"));
});
