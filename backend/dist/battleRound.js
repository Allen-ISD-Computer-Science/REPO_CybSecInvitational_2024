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
exports.verifyBattleRound = exports.router = exports.startBattleRound = exports.BattleRound = void 0;
const express_1 = __importDefault(require("express"));
const loginApi_1 = require("./loginApi");
const roundApi_1 = require("./roundApi");
const path = __importStar(require("path"));
const mongoApi_1 = require("./mongoApi");
const config = require("../config.json");
const lerp = (a, b, t) => a + t * (b - a);
class BattleRound extends roundApi_1.Round {
    static _onEnd() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!roundApi_1.currentRound || (roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) != "BattleRound")
                return;
            let scoreboard = yield (0, mongoApi_1.fetchScoreboard)();
            if (!scoreboard) {
                console.log("Failed to end battle round, scoreboard missing");
                return;
            }
            let round = roundApi_1.currentRound;
            let promises = [];
            scoreboard.forEach((user) => {
                if (!round.divisions[user.division]) {
                    return;
                }
                let contestant = round.contestants[user.username];
                if (contestant) {
                    // ! Currently only takes number of puzzles completed into account
                    let puzzleCount = Object.values(round.puzzles).length;
                    let completedCount = Object.values(contestant.completedBattleRoundPuzzles).length;
                    let ratio = completedCount / puzzleCount;
                    let rewardMultiplier = lerp(0.9, 2, ratio);
                    let awardedPoints = Math.floor(contestant.raw_bid * rewardMultiplier - contestant.raw_bid);
                    promises.push((0, mongoApi_1.addPointsToUser)(user.username, awardedPoints, "puzzle_points"));
                }
                else {
                    // ! Currently removes min bid viable with user's current puzzle points
                    promises.push((0, mongoApi_1.addPointsToUser)(user.username, Math.floor(user.puzzle_points * round.min_bid) * -1, "puzzle_points"));
                }
            });
            yield Promise.all(promises);
            console.log("Battle Round Ended");
        });
    }
    submit(username, name, answer) {
        let contestant = this.contestants[username];
        if (!contestant)
            return { acknowledged: false, notFound: false, alreadyCompleted: false, correct: false }; // Not part of battle round
        let puzzle = this.puzzles[name];
        if (!puzzle)
            return { acknowledged: false, notFound: true, alreadyCompleted: false, correct: false }; // Puzzle not part of battle round
        if (contestant.completedBattleRoundPuzzles[name])
            return { acknowledged: true, notFound: false, alreadyCompleted: true, correct: false }; // Already completed puzzle
        if (puzzle.answer !== answer)
            return { acknowledged: true, notFound: false, alreadyCompleted: false, correct: false }; // Wrong answer
        contestant.completedBattleRoundPuzzles[name] = { timeCompleted: Date.now() };
        return { acknowledged: true, notFound: false, alreadyCompleted: false, correct: true };
    }
    joinRound(username, bid) {
        return __awaiter(this, void 0, void 0, function* () {
            let user = yield (0, mongoApi_1.fetchUser)(username);
            if (!user)
                return { acknowledged: false, success: false };
            let boundedBid = Math.max(0, Math.min(bid, 1));
            if (boundedBid < this.min_bid) {
                return { acknowledged: true, success: false };
            }
            let contestant = {
                username: username,
                completedBattleRoundPuzzles: {},
                bid: boundedBid,
                raw_bid: Math.min(user.puzzle_points * boundedBid),
            };
            this.contestants[username] = contestant;
            return { acknowledged: true, success: true };
        });
    }
    constructor(duration, id, minBid, puzzles, divisions) {
        let divisionsObj = {};
        divisions.forEach((val) => {
            divisionsObj[val] = true;
        });
        super(duration, "BattleRound", id, divisionsObj, BattleRound._onEnd);
        this.type = "BattleRound"; // ensure the type of round
        this.puzzles = puzzles;
        this.min_bid = minBid;
        this.contestants = {};
    }
}
exports.BattleRound = BattleRound;
//* Methods
function startBattleRound(id, divisions, duration = config.battle_round_duration) {
    return __awaiter(this, void 0, void 0, function* () {
        const roundConfig = config.battle_rounds[id];
        if (!roundConfig || !roundConfig.min_bid)
            return false;
        const roundPuzzles = yield (0, mongoApi_1.fetchBattleRoundPuzzles)(id);
        if (!roundPuzzles)
            return false;
        let round = new BattleRound(duration, id, roundConfig.min_bid, roundPuzzles, divisions);
        return (0, roundApi_1.startRound)(round);
    });
}
exports.startBattleRound = startBattleRound;
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
        const status = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid, endTime: round.endTime };
        res.json(status);
        return;
    }
    const status = { acknowledged: true, alreadyJoined: false, minBid: round.min_bid, endTime: round.endTime };
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
        const status = { acknowledged: true, alreadyJoined: true, minBid: round.min_bid, endTime: round.endTime };
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
