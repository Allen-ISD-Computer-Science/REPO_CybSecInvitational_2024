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
exports.verifyBattleRound = exports.router = void 0;
const express_1 = __importDefault(require("express"));
const loginApi_1 = require("./loginApi");
const roundApi_1 = require("./roundApi");
const path = __importStar(require("path"));
//* Routes
exports.router = express_1.default.Router();
function verifyBattleRound(req, res, next) {
    const token = (0, loginApi_1.fetchLoginTokenFromRequest)(req);
    if (!token) {
        res.sendStatus(500);
        return;
    }
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) != "BattleRound" || !roundApi_1.currentRound.divisions[token.data.division.toString()]) {
        res.redirect("home");
        return;
    }
    next();
}
exports.verifyBattleRound = verifyBattleRound;
exports.router.get("/", loginApi_1.validateLoginToken, verifyBattleRound, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/battleRound.html"));
});
exports.router.post("/getStatus", loginApi_1.validateLoginToken, verifyBattleRound, (req, res) => {
    const token = res.locals.token;
    if (!token) {
        res.sendStatus(500);
        return;
    }
    const round = roundApi_1.currentRound;
    if (round.contestants[token.data.username]) {
        const status = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid };
        res.json(status);
        return;
    }
    const status = { acknowledged: true, alreadyJoined: false, minBid: round.min_bid };
    res.json(status);
});
exports.router.post("/join", loginApi_1.validateLoginToken, verifyBattleRound, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const bid = Number(req.body.bid);
    if (!bid && bid !== 0) {
        res.status(400).send("Missing Parameters");
        return;
    }
    const token = res.locals.token;
    if (!token) {
        res.sendStatus(500);
        return;
    }
    const round = roundApi_1.currentRound;
    if (round.contestants[token.data.username]) {
        const status = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid };
        res.json(status);
        return;
    }
    res.json(yield round.joinRound(token.data.username, bid));
}));
exports.router.post("/getPuzzles", loginApi_1.validateLoginToken, verifyBattleRound, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = res.locals.token;
    if (!token) {
        res.sendStatus(500);
        return;
    }
    const round = roundApi_1.currentRound;
    const puzzles = round.puzzles;
    const contestant = round.contestants[token.data.username];
    const bundle = [];
    for (let name in puzzles) {
        const puzzle = puzzles[name];
        const packet = {
            name: puzzle.name,
            completed: false,
        };
        if (contestant && contestant.completedBattleRoundPuzzles[puzzle.name]) {
            packet.completed = true;
        }
        bundle.push(packet);
    }
    res.json(bundle);
}));
exports.router.post("/getPuzzle", loginApi_1.validateLoginToken, verifyBattleRound, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const name = req.body.name;
    if (!name) {
        res.status(400).send("Missing Parameters");
        return;
    }
    const round = roundApi_1.currentRound;
    const puzzle = round.puzzles[name];
    res.json({
        name: puzzle.name,
        description: puzzle.description,
    });
}));
exports.router.post("/submitPuzzle", loginApi_1.validateLoginToken, verifyBattleRound, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const name = req.body.name;
    const answer = req.body.answer;
    if (!name || !answer) {
        res.status(400).send("Missing Parameters");
        return;
    }
    const token = res.locals.token;
    if (!token) {
        res.sendStatus(500);
        return;
    }
    const round = roundApi_1.currentRound;
    const result = round.submit(token.data.username, name, answer);
    res.json(result);
}));
