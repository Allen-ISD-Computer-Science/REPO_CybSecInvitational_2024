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
exports.startRound = exports.endCurrentRound = exports.currentRound = exports.Round = void 0;
const socketApi_1 = require("./socketApi");
const config = require("../config.json");
class Round {
    getSummary() {
        return {
            startTime: this.startTime,
            endTime: this.endTime,
            type: this.type,
            id: this.id,
        };
    }
    constructor(duration, type, id, divisions = { "0": true, "1": true, "2": true }, callback = () => { }) {
        this.startTime = Date.now();
        this.endTime = this.startTime + duration;
        this.callback = callback;
        this.type = type;
        this.id = id;
        this._endTimeout = setTimeout(endCurrentRound, duration);
        this.divisions = divisions;
        console.log(this.divisions);
    }
}
exports.Round = Round;
// * Module Parameters
exports.currentRound = null;
//* Methods
function endCurrentRound() {
    return __awaiter(this, void 0, void 0, function* () {
        // * Callback is called before currentRound is set to null
        console.log("Attempting Round Closure");
        if (!exports.currentRound)
            return;
        clearTimeout(exports.currentRound._endTimeout); // Force stop timeout
        yield exports.currentRound.callback();
        exports.currentRound = null;
        socketApi_1.io.emit("round_end");
    });
}
exports.endCurrentRound = endCurrentRound;
function startRound(round) {
    console.log("Attempting Round Start");
    if (exports.currentRound) {
        return false;
    }
    else {
        exports.currentRound = round;
        socketApi_1.io.emit("round_start", exports.currentRound.getSummary());
        return true;
    }
}
exports.startRound = startRound;
