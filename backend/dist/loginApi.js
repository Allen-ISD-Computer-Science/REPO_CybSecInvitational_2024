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
exports.router = exports.fetchLoginToken = exports.fetchLoginTokenFromRequest = exports.validateLoginToken = exports.loginTokenGroup = exports.TokenGroup = exports.Token = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const mongoApi_1 = require("./mongoApi");
const crypto = require("crypto");
// * Types
class Token {
    constructor(callback = () => { }, data = {}, duration = Token.defaultDuration) {
        this.id = crypto.randomBytes(20).toString("hex");
        (this.data = data), (this.duration = duration);
        this.conceptionTime = Date.now();
        this.expirationTime = this.duration + this.conceptionTime;
        this._callback = callback;
        this._timeout = setTimeout(() => {
            this.destroy(true);
        }, this.duration);
    }
    destroy(withCallback) {
        if (withCallback) {
            this._callback();
            clearTimeout(this._timeout);
        }
        else {
            clearTimeout(this._timeout);
        }
    }
}
exports.Token = Token;
Token.defaultDuration = 120000;
class TokenGroup {
    constructor(duration = TokenGroup.defaultDuration) {
        this.tokens = {};
        this.duration = duration;
    }
    createNewToken(data = {}) {
        const newToken = new Token(() => {
            delete this.tokens[newToken.id];
        }, data, this.duration);
        this.tokens[newToken.id] = newToken;
        return newToken.id;
    }
    removeToken(id, withCallback = true) {
        const token = this.findTokenOfId(id);
        if (!token)
            return false;
        token.destroy(withCallback);
        delete this.tokens[token.id];
        return true;
    }
    findTokenOfId(id) {
        return this.tokens[id];
    }
}
exports.TokenGroup = TokenGroup;
TokenGroup.defaultDuration = 120000;
// * Module Parameters
exports.loginTokenGroup = new TokenGroup(120000);
// * Methods
function validateLoginToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginTokenId = req.cookies["LoginToken"];
        if (!loginTokenId) {
            res.redirect("login");
            return;
        }
        const token = exports.loginTokenGroup.findTokenOfId(loginTokenId);
        if (!token) {
            res.redirect("login");
            return;
        }
        res.locals.token = token;
        next();
    });
}
exports.validateLoginToken = validateLoginToken;
function fetchLoginTokenFromRequest(req) {
    return fetchLoginToken(req.cookies["LoginToken"]);
}
exports.fetchLoginTokenFromRequest = fetchLoginTokenFromRequest;
function fetchLoginToken(id) {
    return exports.loginTokenGroup.findTokenOfId(id);
}
exports.fetchLoginToken = fetchLoginToken;
// * Routes
exports.router = express_1.default.Router();
exports.router.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("attempting login");
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
        res.status(400).send("Missing Username or Password!");
        return;
    }
    let user = yield (0, mongoApi_1.fetchUser)(username);
    if (!user) {
        res.status(400).send("Incorrect Credentials!");
        return;
    }
    if (user.password !== password) {
        res.status(400).send("Incorrect Credentials!");
    }
    const id = exports.loginTokenGroup.createNewToken(user);
    res.cookie("LoginToken", id, { secure: true, maxAge: exports.loginTokenGroup.duration, httpOnly: true }).sendStatus(200);
}));
exports.router.get("/login", (req, res) => {
    const loginTokenId = req.cookies["LoginToken"];
    if (loginTokenId && exports.loginTokenGroup.findTokenOfId(loginTokenId)) {
        res.redirect("home");
        return;
    }
    res.sendFile(path.join(__dirname, "../public/login.html"));
});
exports.router.get("/logout", (req, res) => {
    const loginTokenId = req.cookies["LoginToken"];
    if (loginTokenId) {
        exports.loginTokenGroup.removeToken(loginTokenId);
        res.clearCookie("LoginToken");
    }
    res.redirect("login");
});
