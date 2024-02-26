export class TokenGroup {}

export class Token {
  static defaultDuration: 60000;

  id: string;
  child: any;
  duration: number;
  conceptionTime: number;
  expirationTime: number;
  _timeoutid: number;

  constructor(callback: Function = () => {}) {
    this.id = "";
    this.child = "";
    this.duration = Token.defaultDuration;
    this.conceptionTime = Date.now();
    this.expirationTime = this.duration + this.conceptionTime;

    console.log(Token.defaultDuration);
    this._timeoutid = setTimeout(callback, this.duration);
  }
}

const _ = {
  Token,
  TokenGroup,
};
export default _;
