"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleWare = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const { createServer, get } = require("http");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
exports.app = (0, express_1.default)();
exports.server = createServer(exports.app);
const crypto_1 = require("crypto");
exports.app.use(bodyParser.json());
exports.app.use(bodyParser.urlencoded({ extended: false }));
//Session Handling
exports.sessionMiddleWare = session({
    secret: "570e6f300a19dd0e854547671cbd7fa8e98b5564229e7d1ba1ee9234a2ce3074" ||
        (0, crypto_1.generateKey)("hmac", { length: 256 }, (err, key) => {
            return key;
        }),
    resave: false,
    saveUninitialized: false,
});
exports.app.use(exports.sessionMiddleWare);
//Cookie Handling
const cookieParser = require("cookie-parser");
exports.app.use(cookieParser());
//Static File Serving
exports.app.use(express_1.default.static(path.join(__dirname, "../public")));
