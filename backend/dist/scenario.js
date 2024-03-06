"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPuzzleRound = exports.router = void 0;
const express_1 = __importDefault(require("express"));
const roundApi_1 = require("./roundApi");
// * Methods
// * Routes
exports.router = express_1.default.Router();
// router middleware
function verifyPuzzleRound(req, res, next) {
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) !== "ScenarioRound") {
        res.redirect("home");
    }
    next();
}
exports.verifyPuzzleRound = verifyPuzzleRound;
exports.router.get("/scenario", (req, res) => { });
