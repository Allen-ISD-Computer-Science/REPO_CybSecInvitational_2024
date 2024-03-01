"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBattleRound = exports.startPuzzleRound = exports.startRound = exports.endCurrentRound = exports.currentRound = exports.BattleRound = exports.PuzzleRound = exports.Round = void 0;
const mongoApi_1 = require("mongoApi");
const config = require("../config.json");
class Round {
    constructor(duration, type, id, callback = () => { }) {
        this.startTime = Date.now();
        this.endTime = this.startTime + duration;
        this.callback = callback;
        this.type = type;
        this.id = id;
        this._endTimeout = setTimeout(endCurrentRound, duration);
    }
}
exports.Round = Round;
class PuzzleRound extends Round {
    static _onEnd() {
        console.log("Puzzle Round Ended");
    }
    constructor(duration, id) {
        super(duration, "PuzzleRound", id, PuzzleRound._onEnd);
        this.type = "PuzzleRound"; // ensure the type of round
    }
}
exports.PuzzleRound = PuzzleRound;
class BattleRound extends Round {
    static _onEnd() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!exports.currentRound || (exports.currentRound === null || exports.currentRound === void 0 ? void 0 : exports.currentRound.type) != "BattleRound")
                return;
            let scoreboard = yield (0, mongoApi_1.fetchScoreboard)();
            if (!scoreboard) {
                console.log("Failed to end battle round, scoreboard missing");
                return;
            }
            let round = exports.currentRound;
            let promises = [];
            scoreboard.forEach((user) => {
                let contestant = round.contestants[user.username];
                if (contestant) {
                    // ! Currently only takes number of puzzles completed into account
                    let puzzleCount = Object.values(round.puzzles).length;
                    let completedCount = Object.values(contestant.completedBattleRoundPuzzles).length;
                    let ratio = completedCount / puzzleCount;
                    let rewardMultiplier = lerp(0.9, 2, ratio);
                    let awardedPoints = contestant.raw_bid * rewardMultiplier - contestant.raw_bid;
                    promises.push((0, mongoApi_1.addPointsToUser)(user.username, awardedPoints, "puzzle_points"));
                }
                else {
                    // ! Currently removes min bid viable with user's current puzzle points
                    promises.push((0, mongoApi_1.addPointsToUser)(user.username, user.puzzle_points * round.min_bid * -1, "puzzle_points"));
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
    constructor(duration, id, minBid, puzzles) {
        super(duration, "BattleRound", id, BattleRound._onEnd);
        this.type = "BattleRound"; // ensure the type of round
        this.puzzles = puzzles;
        this.min_bid = minBid;
        this.contestants = {};
    }
}
exports.BattleRound = BattleRound;
// * Module Parameters
exports.currentRound = null;
//
function endCurrentRound() {
    return __awaiter(this, void 0, void 0, function* () {
        // * Callback is called before currentRound is set to null
        console.log("Attempting Round Closure");
        if (!exports.currentRound)
            return;
        clearTimeout(exports.currentRound._endTimeout); // Force stop timeout
        yield exports.currentRound.callback();
        exports.currentRound = null;
    });
}
exports.endCurrentRound = endCurrentRound;
function startRound(round) {
    if (exports.currentRound) {
        return false;
    }
    else {
        exports.currentRound = round;
        return true;
    }
}
exports.startRound = startRound;
function startPuzzleRound(duration, id) {
    let round = new PuzzleRound(duration, id);
    return startRound(round);
}
exports.startPuzzleRound = startPuzzleRound;
function startBattleRound(duration, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const roundConfig = config.battle_rounds[id];
        if (!roundConfig || !roundConfig.min_bid)
            return false;
        const roundPuzzles = yield (0, mongoApi_1.fetchBattleRoundPuzzles)(id);
        if (!roundPuzzles)
            return false;
        let round = new BattleRound(duration, id, roundConfig.min_bid, roundPuzzles);
        return startRound(round);
    });
}
exports.startBattleRound = startBattleRound;
