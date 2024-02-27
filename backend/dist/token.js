"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenGroup = exports.Token = void 0;
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
const _ = {
    Token,
    TokenGroup,
};
exports.default = _;
