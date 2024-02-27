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
exports.validateLoginToken = exports.loginTokenGroup = exports.TokenGroup = exports.Token = void 0;
const crypto = require("crypto");
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
            console.log(this);
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
exports.loginTokenGroup = new TokenGroup(120000);
function validateLoginToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const loginTokenId = req.cookies["LoginToken"];
        if (!loginTokenId || !exports.loginTokenGroup.findTokenOfId(loginTokenId)) {
            res.redirect("login");
        }
        else {
            next();
        }
    });
}
exports.validateLoginToken = validateLoginToken;
