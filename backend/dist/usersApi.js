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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const mongoApi_1 = require("./mongoApi");
const loginApi_1 = require("./loginApi");
// * Methods
// fetches specific user, includes ALL data present in the db
// * Routes
exports.router = express_1.default.Router();
exports.router.post("/getUser", loginApi_1.validateLoginToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // fetch user from token
    const user = (_a = (0, loginApi_1.fetchLoginToken)(req.cookies["LoginToken"])) === null || _a === void 0 ? void 0 : _a.data;
    if (!user) {
        console.log("user not found!");
        res.status(404).send("User Not Found");
        return;
    }
    const userData = (yield (0, mongoApi_1.fetchUser)(user.username));
    delete userData._id;
    delete userData.password;
    res.json(userData);
}));
