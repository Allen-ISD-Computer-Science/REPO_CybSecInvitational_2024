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
exports.router = exports.validateLoginToken = exports.loginTokenGroup = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const loginApi_1 = require("./loginApi");
const mongoApi_1 = require("./mongoApi");
const roundApi_1 = require("./roundApi");
const socketApi_1 = require("./socketApi");
// * Module Parameters
exports.loginTokenGroup = new loginApi_1.TokenGroup(120000);
// * Methods
function validateLoginToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginTokenId = req.cookies["AdminLoginToken"];
        if (!loginTokenId) {
            res.status(403).send("Unauthorized");
            return;
        }
        const token = exports.loginTokenGroup.findTokenOfId(loginTokenId);
        if (!token) {
            res.status(403).send("Unauthorized");
            return;
        }
        res.locals.token = token;
        next();
    });
}
exports.validateLoginToken = validateLoginToken;
const commands = {
    ["PUZZLE_POINTS"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const operator = tokens[1];
        const target = tokens[2];
        const amount = Number(tokens[3]);
        if (!operator || !target || !amount) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        if (operator == "ADD") {
            const result = yield (0, mongoApi_1.addPointsToUser)(target, amount, "puzzle_points");
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else if (operator == "SUB") {
            const result = yield (0, mongoApi_1.addPointsToUser)(target, -amount, "puzzle_points");
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else if (operator == "SET") {
            const result = yield (0, mongoApi_1.setPointsOfUser)(target, amount, "puzzle_points");
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else {
            res.status(400).send("Invalid Operator");
            return;
        }
    }),
    ["SCENARIO_POINTS"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const operator = tokens[1];
        const target = tokens[2];
        const amount = Number(tokens[3]);
        if (!operator || !target || !amount) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        if (operator == "ADD") {
            const result = yield (0, mongoApi_1.addPointsToUser)(target, amount, "scenario_points");
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else if (operator == "SUB") {
            const result = yield (0, mongoApi_1.addPointsToUser)(target, -amount, "scenario_points");
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else if (operator == "SET") {
            const result = yield (0, mongoApi_1.setPointsOfUser)(target, amount, "scenario_points");
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else {
            res.status(400).send("Invalid Operator");
            return;
        }
    }),
    ["COMPLETED_PUZZLES"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const operator = tokens[1];
        const target = tokens[2];
        const puzzleName = tokens[3];
        if (!operator || !target || !puzzleName) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        if (operator == "ADD") {
            const result = yield (0, mongoApi_1.markPuzzleAsCompleted)(target, puzzleName);
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else if (operator == "SUB") {
            const result = yield (0, mongoApi_1.markPuzzleAsNotCompleted)(target, puzzleName);
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else {
            res.status(400).send("Invalid Operator");
            return;
        }
    }),
    ["DIVISION"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const operator = tokens[1];
        const target = tokens[2];
        const division = Number(tokens[2]);
        if (!operator || !target || !division) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        if (operator == "SET") {
            const result = yield (0, mongoApi_1.setDivisionOfUser)(target, division);
            if (result) {
                res.sendStatus(200);
            }
            else {
                res.sendStatus(500);
            }
        }
        else {
            res.status(400).send("Invalid Operator");
            return;
        }
    }),
    ["BATTLE_ROUND"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const id = tokens[1];
        const duration = Number(tokens[2]);
        if (!id) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        let result = undefined;
        if (duration) {
            // Number() returns NaN when not a number, making sure that the function doesn't use NaN
            result = yield (0, roundApi_1.startBattleRound)(id, duration);
        }
        else {
            result = yield (0, roundApi_1.startBattleRound)(id);
        }
        if (result) {
            res.sendStatus(200);
        }
        else {
            res.sendStatus(500);
        }
    }),
    ["PUZZLE_ROUND"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const id = tokens[1];
        const duration = Number(tokens[2]);
        if (!id) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        let result = undefined;
        if (duration) {
            // Number() returns NaN when not a number, making sure that the function doesn't use NaN
            result = (0, roundApi_1.startPuzzleRound)(id, duration);
        }
        else {
            result = (0, roundApi_1.startPuzzleRound)(id);
        }
        if (result) {
            res.sendStatus(200);
        }
        else {
            res.sendStatus(500);
        }
    }),
    ["ROUND"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const operator = tokens[1];
        if (!operator) {
            res.status(400).send("Missing or Invalid Options");
            return;
        }
        if (operator == "END") {
            (0, roundApi_1.endCurrentRound)();
            res.sendStatus(200);
        }
        else {
            res.status(400).send("Invalid Operator");
            return;
        }
    }),
    ["ALERT"]: (tokens, res) => __awaiter(void 0, void 0, void 0, function* () {
        const level = Number(tokens[1]);
        const message = tokens.slice(2).join(" ");
        if (!level) {
            res.status(400).send("Invalid Alert Level");
            return;
        }
        socketApi_1.io.emit("alert", {
            level: level,
            message: message,
        });
        res.sendStatus(200);
    }),
};
function parseCommand(command, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const commandTokens = command.split(" ");
        const commandFunc = commands[commandTokens[0]];
        if (!commandFunc) {
            res.status(404).send("Command Not Found");
        }
        commandFunc(commandTokens, res);
    });
}
// * Routes
exports.router = express_1.default.Router();
exports.router.post("/adminCommand", validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const command = req.body.command;
    if (!command) {
        res.status(400).send("Missing Command");
        return;
    }
    parseCommand(command, res);
}));
exports.router.post("/adminLogin", validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("attempting login");
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        res.status(400).send("Missing Username or Password!");
        return;
    }
    let user = yield (0, mongoApi_1.fetchAdmin)(username);
    if (!user) {
        res.status(400).send("Incorrect Credentials!");
        return;
    }
    if (user.password !== password) {
        res.status(400).send("Incorrect Credentials!");
    }
    const id = exports.loginTokenGroup.createNewToken(user);
    res.cookie("AdminLoginToken", id, { secure: true, maxAge: exports.loginTokenGroup.duration, httpOnly: true }).redirect("home");
}));
exports.router.get("/adminLogin", (req, res) => {
    const loginTokenId = req.cookies["AdminLoginToken"];
    if (loginTokenId && exports.loginTokenGroup.findTokenOfId(loginTokenId)) {
        res.redirect("home");
        return;
    }
    res.sendFile(path.join(__dirname, "../public/adminLogin.html"));
});
exports.router.get("/adminLogout", validateLoginToken, (req, res) => {
    const loginTokenId = req.cookies["AdminLoginToken"];
    if (loginTokenId) {
        exports.loginTokenGroup.removeToken(loginTokenId);
        res.clearCookie("AdminLoginToken");
    }
    res.redirect("adminLogin");
});
