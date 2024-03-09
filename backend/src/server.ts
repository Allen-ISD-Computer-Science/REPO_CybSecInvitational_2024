import express from "express";
const { createServer, get } = require("http");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");

export const app = express();
export const server = createServer(app);

import { generateKey, verify } from "crypto";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//Session Handling
export const sessionMiddleWare = session({
  secret:
    "570e6f300a19dd0e854547671cbd7fa8e98b5564229e7d1ba1ee9234a2ce3074" ||
    generateKey("hmac", { length: 256 }, (err, key) => {
      return key;
    }),
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleWare);

declare module "express-session" {
  interface SessionData {
    username: string;
  }
}

//Cookie Handling
const cookieParser = require("cookie-parser");
app.use(cookieParser());

//Static File Serving
app.use(express.static(path.join(__dirname, "../public")));
