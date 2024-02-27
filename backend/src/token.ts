const crypto = require("crypto");

export class Token {
  static readonly defaultDuration: number = 120000;

  readonly id: string;
  readonly data: Object;
  readonly duration: number;
  readonly conceptionTime: number;
  readonly expirationTime: number;

  private _callback: Function;
  private _timeout: number | NodeJS.Timeout;

  constructor(callback: Function = () => {}, data = {}, duration = Token.defaultDuration) {
    this.id = crypto.randomBytes(20).toString("hex");
    (this.data = data), (this.duration = duration);
    this.conceptionTime = Date.now();
    this.expirationTime = this.duration + this.conceptionTime;

    this._callback = callback;
    this._timeout = setTimeout(() => {
      this.destroy(true);
    }, this.duration);
  }

  destroy(withCallback: boolean) {
    if (withCallback) {
      console.log(this);
      this._callback();
      clearTimeout(this._timeout);
    } else {
      clearTimeout(this._timeout);
    }
  }
}

export class TokenGroup {
  static readonly defaultDuration: number = 120000;

  readonly tokens: { [id: string]: Token };
  readonly duration: number;

  constructor(duration: number = TokenGroup.defaultDuration) {
    this.tokens = {};
    this.duration = duration;
  }

  createNewToken(data: Object = {}): string {
    const newToken = new Token(
      () => {
        delete this.tokens[newToken.id];
      },
      data,
      this.duration
    );

    this.tokens[newToken.id] = newToken;
    return newToken.id;
  }

  removeToken(id: string, withCallback: boolean = true): boolean {
    const token = this.findTokenOfId(id);
    if (!token) return false;

    token.destroy(withCallback);
    delete this.tokens[token.id];
    return true;
  }

  findTokenOfId(id: string): Token | null {
    return this.tokens[id];
  }
}

const _ = {
  Token,
  TokenGroup,
};
export default _;
