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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPuzzles = exports.setDivisionOfUser = exports.markPuzzleAsNotCompleted = exports.markPuzzleAsCompleted = exports.setPointsOfUser = exports.onPuzzleCorrect = exports.addPointsToUser = exports.fetchScoreboard = exports.fetchAllUsers = exports.fetchUser = exports.fetchBattleRoundPuzzles = exports.fetchAdmin = exports.createUser = exports.searchForEmails = exports.client = exports.adminColName = exports.battleRoundPuzzlesColName = exports.puzzlesColName = exports.usersColName = exports.mainDbName = void 0;
const env = __importStar(require("dotenv"));
env.config();
const config = require("../config.json");
if (!process.env.MONGODB_USERNAME)
    throw Error("Process missing MongoDB Username");
if (!process.env.MONGODB_PASSWORD)
    throw Error("Process missing MongoDB Password");
if (!process.env.MAIN_DATABASE_NAME)
    throw Error("Missing main database name");
if (!process.env.USERS_COLLECTION)
    throw Error("Missing users collection name");
if (!process.env.PUZZLES_COLLECTION)
    throw Error("Missing puzzles collection name");
if (!process.env.BATTLE_ROUND_COLLECTION)
    throw Error("Missing battle round collection name");
if (!process.env.ADMINISTRATOR_COLLECTION)
    throw Error("Missing administrator collection name");
const mongodb_1 = require("mongodb");
const mongo_username = encodeURIComponent(process.env.MONGODB_USERNAME);
const mongo_password = encodeURIComponent(process.env.MONGODB_PASSWORD);
// * Module Parameters
exports.mainDbName = process.env.MAIN_DATABASE_NAME;
exports.usersColName = process.env.USERS_COLLECTION;
exports.puzzlesColName = process.env.PUZZLES_COLLECTION;
exports.battleRoundPuzzlesColName = process.env.BATTLE_ROUND_COLLECTION;
exports.adminColName = process.env.ADMINISTRATOR_COLLECTION;
const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;
// * Module Initialization
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
exports.client = new mongodb_1.MongoClient(uri, {
    serverApi: {
        version: mongodb_1.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
// Close connection when server stops
process.on("SIGINT", () => {
    exports.client.close().then(() => {
        console.info("Mongoose primary connection disconnected through app termination!");
        process.exit(0);
    });
});
// * Methods
function searchForEmails(emails) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(emails);
        let result = yield exports.client
            .db(exports.mainDbName)
            .collection(exports.usersColName)
            .findOne({ members: { $elemMatch: { email: { $in: emails } } } });
        console.log(result);
        return result;
    });
}
exports.searchForEmails = searchForEmails;
function genRandPassword() {
    return Math.random().toString(36).slice(-8);
}
function genRandHex(size) {
    return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}
function createUser(participants) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const user = {
                division: 0,
                username: `${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}`,
                password: genRandPassword(),
                completed_puzzles: {},
                members: participants,
                puzzle_points: 0,
                scenario_points: 0,
            };
            let result = yield exports.client.db(exports.mainDbName).collection(exports.usersColName).insertOne(user);
            if (result.acknowledged) {
                return user;
            }
            else {
                return null;
            }
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
exports.createUser = createUser;
function fetchAdmin(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.client.db(exports.mainDbName).collection(exports.adminColName).findOne({ username: username });
            return result;
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
exports.fetchAdmin = fetchAdmin;
function fetchBattleRoundPuzzles(roundId) {
    return __awaiter(this, void 0, void 0, function* () {
        const roundConfig = config.battle_rounds[roundId];
        if (!roundConfig || !roundConfig.puzzles || !roundConfig.min_bid) {
            return null;
        }
        console.log(roundConfig);
        try {
            const result = (yield exports.client
                .db(exports.mainDbName)
                .collection(exports.battleRoundPuzzlesColName)
                .find({ name: { $in: roundConfig.puzzles } })
                .toArray());
            let retVal = {};
            result.forEach((puzzle) => {
                retVal[puzzle.name] = puzzle;
            });
            return retVal;
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
exports.fetchBattleRoundPuzzles = fetchBattleRoundPuzzles;
function fetchUser(username) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.client.db(exports.mainDbName).collection(exports.usersColName).findOne({ username: username });
            return result;
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
exports.fetchUser = fetchUser;
// fetches all users, includes ALL data present in the db
function fetchAllUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cursor = yield exports.client.db(exports.mainDbName).collection(exports.usersColName).find();
            return cursor.toArray();
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
exports.fetchAllUsers = fetchAllUsers;
// fetches every users data sorted according to total number of points
function fetchScoreboard() {
    return __awaiter(this, void 0, void 0, function* () {
        const allUsers = yield fetchAllUsers();
        if (!allUsers)
            return null;
        const scoreboard = [];
        allUsers.forEach((user) => {
            scoreboard.push({
                division: user.division,
                username: user.username,
                puzzle_points: user.puzzle_points,
                scenario_points: user.scenario_points,
            });
        });
        scoreboard.sort((a, b) => {
            return a.puzzle_points + a.scenario_points - (b.puzzle_points + b.scenario_points);
        });
        return scoreboard;
    });
}
exports.fetchScoreboard = fetchScoreboard;
// returns true if successfully added, false if not
function addPointsToUser(username, amount, category) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.client
                .db(exports.mainDbName)
                .collection(exports.usersColName)
                .updateOne({ username: username, [category]: { $exists: true } }, { $inc: { [category]: amount } });
            if (result.matchedCount <= 0 || result.modifiedCount <= 0)
                return false;
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    });
}
exports.addPointsToUser = addPointsToUser;
// adds puzzle points to user and sets puzzle as completed
function onPuzzleCorrect(username, amount, puzzleName) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.client
                .db(exports.mainDbName)
                .collection(exports.usersColName)
                .updateOne({ username: username }, { $inc: { puzzle_points: amount }, $set: { [`completed_puzzles.${puzzleName}`]: true } });
            if (result.matchedCount <= 0 || result.modifiedCount <= 0)
                return false;
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    });
}
exports.onPuzzleCorrect = onPuzzleCorrect;
// returns true if successfully set, false if not
function setPointsOfUser(username, amount, category) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cursor = yield exports.client
                .db(exports.mainDbName)
                .collection(exports.usersColName)
                .updateOne({ username: username, [category]: { $exists: true } }, { $set: { [category]: amount } });
            if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0)
                return false;
            return true;
        }
        catch (err) {
            console.log(err);
            return false;
        }
    });
}
exports.setPointsOfUser = setPointsOfUser;
// sets a puzzle as completed in a specified user
function markPuzzleAsCompleted(username, name) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cursor = yield exports.client
                .db(exports.mainDbName)
                .collection(exports.usersColName)
                .updateOne({ username: username }, { $set: { [`completed_puzzles.${name}`]: true } });
            if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0)
                return false;
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
exports.markPuzzleAsCompleted = markPuzzleAsCompleted;
// sets a puzzle as not completed in a specified user
function markPuzzleAsNotCompleted(username, name) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cursor = yield exports.client
                .db(exports.mainDbName)
                .collection(exports.usersColName)
                .updateOne({ username: username }, { $unset: { [`completed_puzzles.${name}`]: true } });
            if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0)
                return false;
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
exports.markPuzzleAsNotCompleted = markPuzzleAsNotCompleted;
// sets the division of specified user
function setDivisionOfUser(username, division) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const cursor = yield exports.client
                .db(exports.mainDbName)
                .collection(exports.usersColName)
                .updateOne({ username: username }, { $set: { division: division } });
            if (cursor.matchedCount <= 0 || cursor.modifiedCount <= 0)
                return false;
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
exports.setDivisionOfUser = setDivisionOfUser;
function createPuzzles(puzzles) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = yield exports.client.db(exports.mainDbName).collection(exports.puzzlesColName).insertMany(puzzles);
            if (result.acknowledged && result.insertedCount != puzzles.length) {
                return true;
            }
            else {
                return false;
            }
        }
        catch (err) {
            console.log(err);
            return false;
        }
    });
}
exports.createPuzzles = createPuzzles;
