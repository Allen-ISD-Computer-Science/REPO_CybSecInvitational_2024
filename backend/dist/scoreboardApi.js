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
exports.router = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const mongoApi_1 = require("./mongoApi");
const loginApi_1 = require("./loginApi");
// * Methods
// fetches specific user, includes ALL data present in the db
// * Routes
exports.router = express_1.default.Router();
exports.router.get("/scoreboard", loginApi_1.validateLoginToken, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/puzzles.html"));
});
exports.router.post("/getScoreboard", loginApi_1.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // fetch user from token
    const user = (_a = (0, loginApi_1.fetchLoginToken)(req.cookies["LoginToken"])) === null || _a === void 0 ? void 0 : _a.data;
    if (!user) {
        res.status(404).send("User Not Found");
    }
    const userData = (yield (0, mongoApi_1.fetchUser)(user.username));
    delete userData._id;
    delete userData.password;
    res.json(userData);
}));
