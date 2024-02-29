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
exports.router = exports.fetchPuzzleOnlyDescription = exports.fetchPuzzle = exports.puzzles = void 0;
const express_1 = __importDefault(require("express"));
const loginApi = __importStar(require("./loginApi"));
const mongoApi = __importStar(require("./mongoApi"));
const path = __importStar(require("path"));
exports.puzzles = {};
function replicatePuzzles() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const result = (yield mongoApi.client
                .db(mongoApi.mainDbName)
                .collection(mongoApi.puzzlesColName)
                .find({}, { projection: { _id: 0 } })
                .toArray());
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
replicatePuzzles().then(() => {
    console.log(fetchPuzzleOnlyDescription("templatePuzzleName"));
});
function fetchPuzzle(name) {
    return exports.puzzles[name];
}
exports.fetchPuzzle = fetchPuzzle;
function fetchPuzzleOnlyDescription(name) {
    let puzzle = fetchPuzzle(name);
    if (!puzzle)
        return null;
    delete puzzle._id;
    delete puzzle.answer;
    return puzzle;
}
exports.fetchPuzzleOnlyDescription = fetchPuzzleOnlyDescription;
// Routes
exports.router = express_1.default.Router();
exports.router.get("/puzzles", loginApi.validateLoginToken, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/puzzles.html"));
});
exports.router.get("/puzzle", loginApi.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const user = yield mongoApi.fetchUser((_b = (_a = res.locals.token) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.username);
    console.log(user);
    res.send("POST request to the homepage");
}));
exports.router.post("/getPuzzle", loginApi.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () { }));
