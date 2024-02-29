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
exports.fetchScoreboard = exports.fetchAllUsers = exports.fetchUser = exports.client = exports.adminColName = exports.battleRoundPuzzlesColName = exports.puzzlesColName = exports.usersColName = exports.mainDbName = void 0;
const env = __importStar(require("dotenv"));
env.config();
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
const mongo_username = encodeURIComponent(process.env.MONGODB_USERNAME);
const mongo_password = encodeURIComponent(process.env.MONGODB_PASSWORD);
exports.mainDbName = process.env.MAIN_DATABASE_NAME;
exports.usersColName = process.env.USERS_COLLECTION;
exports.puzzlesColName = process.env.PUZZLES_COLLECTION;
exports.battleRoundPuzzlesColName = process.env.BATTLE_ROUND_COLLECTION;
exports.adminColName = process.env.ADMINISTRATOR_COLLECTION;
const mongodb_1 = require("mongodb");
const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;
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
        return scoreboard;
    });
}
exports.fetchScoreboard = fetchScoreboard;
