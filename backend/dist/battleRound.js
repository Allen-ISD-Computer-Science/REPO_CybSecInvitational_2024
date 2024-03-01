"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBattleRound = void 0;
const roundApi_1 = require("roundApi");
function verifyBattleRound(req, res, next) {
    if ((roundApi_1.currentRound === null || roundApi_1.currentRound === void 0 ? void 0 : roundApi_1.currentRound.type) != "BattleRound") {
        res.redirect("home");
    }
    next();
}
exports.verifyBattleRound = verifyBattleRound;
