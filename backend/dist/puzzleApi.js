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
exports.verifyPuzzleRound = exports.router = exports.fetchPuzzleDescription = exports.fetchAllPuzzleData = exports.fetchPuzzle = exports.replicatePuzzles = exports.startPuzzleRound = exports.battleRoundPuzzles = exports.puzzles = exports.PuzzleRound = exports.PuzzleSubmitResult = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const config = require("../config.json");
const mongoApi_1 = require("./mongoApi");
const loginApi_1 = require("./loginApi");
const roundApi_1 = require("./roundApi");
class PuzzleSubmitResult {
    constructor(alreadyCompleted, correct) {
        this.alreadyCompleted = alreadyCompleted;
        this.correct = correct;
    }
}
exports.PuzzleSubmitResult = PuzzleSubmitResult;
class PuzzleRound extends roundApi_1.Round {
    static _onEnd() {
        console.log("Puzzle Round Ended");
    }
    constructor(duration, id, divisions) {
        let divisionsObj = {};
        divisions.forEach((val) => {
            divisionsObj[val] = true;
        });
        super(duration, "PuzzleRound", id, divisionsObj, PuzzleRound._onEnd);
        this.type = "PuzzleRound"; // ensure the type of round
    }
}
exports.PuzzleRound = PuzzleRound;
// * Module Parameters
exports.puzzles = {};
exports.battleRoundPuzzles = {};
// * Methods
//
function startPuzzleRound(id, divisions, duration = config.puzzle_round_duration) {
    let round = new PuzzleRound(duration, id, divisions);
    return (0, roundApi_1.startRound)(round);
}
exports.startPuzzleRound = startPuzzleRound;
// Replicates all current puzzles in db to puzzles variable
function replicatePuzzles() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = (yield mongoApi_1.client.db(mongoApi_1.mainDbName).collection(mongoApi_1.puzzlesColName).find({}).toArray());
            if (!result) {
                console.warn("Failed to replicate puzzles from backend!");
            }
            else {
                result.forEach((puzzle) => {
                    exports.puzzles[puzzle.name] = puzzle;
                });
            }
        }
        catch (err) {
            console.log(err);
        }
    });
}
exports.replicatePuzzles = replicatePuzzles;
// fetches puzzle from puzzles variable
function fetchPuzzle(name) {
    // return copy of puzzle
    return Object.assign({}, exports.puzzles[name]);
}
exports.fetchPuzzle = fetchPuzzle;
// fetches all puzzles excluding description and answer
function fetchAllPuzzleData() {
    let puzzleData = [];
    for (let puzzleName in exports.puzzles) {
        let value = fetchPuzzle(puzzleName);
        delete value._id;
        delete value.answer;
        delete value.description;
        puzzleData.push(value);
    }
    return puzzleData;
}
exports.fetchAllPuzzleData = fetchAllPuzzleData;
// fetches only the description data of puzzle
function fetchPuzzleDescription(name) {
    let puzzle = fetchPuzzle(name);
    if (!puzzle)
        return null;
    delete puzzle._id;
    delete puzzle.answer;
    return puzzle;
}
exports.fetchPuzzleDescription = fetchPuzzleDescription;
// * Routes
exports.router = express_1.default.Router();
// router middleware
function verifyPuzzleRound(req, res, next) {
    const token = (0, loginApi_1.fetchLoginTokenFromRequest)(req);
    if (!token) {
        res.sendStatus(500);
        return;
    }
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) !== "PuzzleRound" || !roundApi_1.currentRound.divisions[token.data.division.toString()]) {
        res.redirect("home");
        return;
    }
    next();
}
exports.verifyPuzzleRound = verifyPuzzleRound;
// serves puzzle page
exports.router.get("/puzzles", loginApi_1.validateLoginToken, verifyPuzzleRound, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.sendFile(path.join(__dirname, "../public/puzzles.html"));
}));
// used to fetch puzzle description from client side
exports.router.post("/getPuzzle", loginApi_1.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const name = req.body.name;
    if (!name) {
        res.status(400).send("Missing Puzzle Name");
        return;
    }
    const puzzle = fetchPuzzleDescription(name);
    if (!puzzle) {
        res.status(404).send("Puzzle Not Found");
        return;
    }
    res.json(puzzle);
}));
exports.router.post("/getAllPuzzles", loginApi_1.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.json(fetchAllPuzzleData());
}));
// used to submit puzzle and awards points if correct
exports.router.post("/submitPuzzle", loginApi_1.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const name = req.body.name;
    const answer = req.body.answer;
    // verify correct input parameters
    if (!name || !answer) {
        res.status(400).send("Missing Parameters");
        return;
    }
    // fetch user from token
    const userData = (_a = (0, loginApi_1.fetchLoginToken)(req.cookies["LoginToken"])) === null || _a === void 0 ? void 0 : _a.data;
    const user = yield (0, mongoApi_1.fetchUser)(userData.username);
    if (!user) {
        res.status(404).send("User Not Found");
        return;
    }
    if (user.completed_puzzles[name]) {
        res.json(new PuzzleSubmitResult(true, false));
        return;
    }
    // ? May not be needed due to typescript consistency
    // check if token contains user
    // if (!user) {
    //   res.status(404).send("Missing User From Token");
    //   return;
    // }
    // verify puzzle exists
    const puzzle = fetchPuzzle(name);
    if (!puzzle) {
        res.status(404).send("Puzzle Not Found");
        return;
    }
    // process submission then send result back
    if (puzzle.answer === answer) {
        const result = (0, mongoApi_1.onPuzzleCorrect)(user.username, puzzle.point_value, puzzle.name);
        if (!result) {
            res.sendStatus(500);
            return;
        }
        res.json(new PuzzleSubmitResult(false, true));
        return;
    }
    else {
        res.json(new PuzzleSubmitResult(false, false));
        return;
    }
}));
//