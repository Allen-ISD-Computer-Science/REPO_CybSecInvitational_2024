import { app } from "./server";
import * as path from "path";
import express, { Request, Response } from "express";
import * as mongoApi from "./mongoApi";

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

export const loginTokenGroup = new TokenGroup(120000);
export async function validateLoginToken(req: express.Request, res: express.Response, next: Function) {
  const loginTokenId = req.cookies["LoginToken"];
  if (!loginTokenId) {
    res.redirect("login");
    return;
  }
  const token = loginTokenGroup.findTokenOfId(loginTokenId);
  if (!token) {
    res.redirect("login");
    return;
  }
  res.locals.token = token;

  next();
}

app.post("/login", async (req: Request, res: Response) => {
  console.log("attempting login");
  const username: string | undefined = req.body.username;
  const password: string | undefined = req.body.password;

  if (!username || !password) {
    res.status(400).send("Missing Username or Password!");
    return;
  }

  let user = await mongoApi.fetchUser(username);
  if (!user) {
    res.status(400).send("Incorrect Credentials!");
    return;
  }

  if (user.password !== password) {
    res.status(400).send("Incorrect Credentials!");
  }

  const id = loginTokenGroup.createNewToken(user);
  res.cookie("LoginToken", id, { secure: true, maxAge: loginTokenGroup.duration, httpOnly: true }).redirect("home");
});

app.get("/login", (req: Request, res: Response) => {
  const loginTokenId = req.cookies["LoginToken"];

  if (loginTokenId && loginTokenGroup.findTokenOfId(loginTokenId)) {
    res.redirect("home");
    return;
  }

  res.sendFile(path.join(__dirname, "../public/login.html"));
});

app.get("/logout", (req: Request, res: Response) => {
  const loginTokenId = req.cookies["LoginToken"];
  if (loginTokenId) {
    loginTokenGroup.removeToken(loginTokenId);
    res.clearCookie("LoginToken");
  }

  res.redirect("login");
});
