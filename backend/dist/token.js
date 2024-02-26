"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = exports.TokenGroup = void 0;
class TokenGroup {
}
exports.TokenGroup = TokenGroup;
class Token {
    constructor(callback = () => { }) {
        this.id = "";
        this.child = "";
        this.duration = Token.defaultDuration;
        this.conceptionTime = Date.now();
        this.expirationTime = this.duration + this.conceptionTime;
        console.log(Token.defaultDuration);
        this._timeoutid = setTimeout(callback, this.duration);
    }
}
exports.Token = Token;
const _ = {
    Token,
    TokenGroup,
};
exports.default = _;
