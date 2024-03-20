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
exports.router = void 0;
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const loginApi_1 = require("./loginApi");
const mongoApi_1 = require("./mongoApi");
const emailApi_1 = require("./emailApi");
const config = require("../config.json");
const tokenGroup = new loginApi_1.TokenGroup(3600000);
let references = {}; // holds the codes during email verification
// * Methods
const regexp = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
function validateEmail(email) {
    return regexp.test(email.toLowerCase());
}
function createGroup(registrants) { }
// * Routes
exports.router = express_1.default.Router();
exports.router.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/register.html"));
});
exports.router.get("/confirm", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/confirm.html"));
});
exports.router.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let registrants = [];
    const registrantsBody = req.body.registrants;
    if (!Array.isArray(registrantsBody)) {
        res.status(400).send("Invalid Registration Format");
        return;
    }
    if (registrantsBody.length > 2) {
        res.status(400).send("Too Many Registrants In Group");
        return;
    }
    let emails = [];
    registrantsBody.forEach((registrant) => {
        const email = registrant.email;
        const firstName = registrant.firstName;
        const lastName = registrant.lastName;
        const school = registrant.school;
        const gradeLevel = registrant.gradeLevel;
        const shirtSize = registrant.shirtSize;
        const dietaryRestriction = registrant.dietaryRestriction;
        if (!email || !firstName || !lastName || !school || !gradeLevel || !shirtSize || !dietaryRestriction) {
            res.status(400).send("Missing Parameters!");
            return;
        }
        if (!validateEmail(email)) {
            res.status(400).send("Invalid Email Format");
            return;
        }
        registrants.push({
            email: email,
            firstName: firstName,
            lastName: lastName,
            school: school,
            gradeLevel: gradeLevel,
            shirtSize: shirtSize,
            dietaryRestriction: dietaryRestriction,
        });
        emails.push(email);
    });
    if (yield (0, mongoApi_1.searchForEmails)(emails)) {
        res.status(400).send("Account With Email Already Exists!");
        return;
    }
    const id = tokenGroup.createNewToken(registrants, () => {
        //delete references once token expires
        registrants.forEach((registrant) => {
            try {
                delete references[registrant.email];
            }
            catch (_a) {
                return;
            }
        });
    });
    registrants.forEach((registrant) => __awaiter(void 0, void 0, void 0, function* () {
        let code = Math.floor(100000 + Math.random() * 900000);
        references[registrant.email] = {
            code: code,
            tokenId: id,
        };
        (0, emailApi_1.sendVerificationEmail)(registrant.email, code, registrant);
    }));
    res.sendStatus(200);
}));
exports.router.post("/registerVerify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const email = req.body.email;
    const code = req.body.code;
    if (!email || !code) {
        res.status(400).send("Missing Parameters");
        return;
    }
    const reference = references[email];
    if (!reference) {
        res.status(400).send("Registration Group Not Found");
        return;
    }
    const token = tokenGroup.findTokenOfId(reference.tokenId);
    if (!token) {
        res.status(400).send("Failed to Fetch Registration Token");
        return;
    }
    if (reference.code !== Number(code) && code !== process.env.ADMIN_CONFIRM_EMAIL_PIN) {
        res.status(403).send("Invalid Confirmation Code");
        return;
    }
    // remove reference of current confirmed
    delete references[email];
    let resolved = true;
    for (let registrant of token.data) {
        if (references[registrant.email]) {
            resolved = false;
        }
    }
    if (resolved) {
        // remove token if group has been resolved
        const user = yield (0, mongoApi_1.createUser)(token.data);
        if (!user) {
            res.sendStatus(500);
            return;
        }
        //send emails
        token.data.forEach((registrant) => __awaiter(void 0, void 0, void 0, function* () {
            (0, emailApi_1.sendConfirmationEmail)(registrant.email, user.username, user.password, registrant);
        }));
        tokenGroup.removeToken(token.id);
    }
    res.sendStatus(200);
}));
