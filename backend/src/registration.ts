import * as path from "path";
import express, { Request, Response, Router } from "express";
import { createTransport } from "nodemailer";
import { Token, TokenGroup } from "./loginApi";
import { createUser, searchForEmails } from "./mongoApi";

const config = require("../config.json");
const transporter = createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "info.ahscyber@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// export const tokenGroup = new TokenGroup(5000);
interface Reference {
  code: number;
  tokenId: string;
}

export interface RegistrationToken extends Token {
  readonly data: Registrant[];
}

const tokenGroup = new TokenGroup(3_600_000);
let references: { [email: string]: Reference } = {}; // holds the codes during email verification

// * Methods
const regexp = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
function validateEmail(email: string) {
  return regexp.test(email.toLowerCase());
}

function createGroup(registrants: Registrant[]) {}
// * Routes
export const router: Router = express.Router();

router.get("/register", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/register.html"));
});

router.get("/confirm", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/confirm.html"));
});

router.post("/register", async (req: Request, res: Response) => {
  let registrants: Registrant[] = [];
  const registrantsBody = req.body.registrants;
  if (!Array.isArray(registrantsBody)) {
    res.status(400).send("Invalid Registration Format");
    return;
  }

  if (registrantsBody.length > 2) {
    res.status(400).send("Too Many Registrants In Group");
    return;
  }

  let emails: string[] = [];

  registrantsBody.forEach((registrant) => {
    const email: string = registrant.email;
    const firstName: string = registrant.firstName;
    const lastName: string = registrant.lastName;
    const school: string = registrant.school;
    const gradeLevel: string = registrant.gradeLevel;
    const shirtSize: string = registrant.shirtSize;
    const dietaryRestriction: string = registrant.dietaryRestriction;

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

  console.log(emails);
  console.log(await searchForEmails(emails));
  if (await searchForEmails(emails)) {
    res.status(400).send("Account With Email Already Exists!");
    return;
  }

  const id = tokenGroup.createNewToken(registrants, () => {
    registrants.forEach((registrant) => {
      try {
        delete references[registrant.email];
      } catch {
        return;
      }
    });
    console.log("GONE!", references);
  });

  registrants.forEach((registrant) => {
    references[registrant.email] = {
      code: Math.floor(100000 + Math.random() * 900000),
      tokenId: id,
    };
  });

  //   console.log(registrants);
  console.log(references);
});

router.post("/registerVerify", async (req: Request, res: Response) => {
  const email: string = String(req.body.email);
  const code: number = Number(req.body.code);

  if (!email || !code) {
    res.status(400).send("Missing Parameters");
    return;
  }

  const reference: Reference = references[email];
  if (!reference) {
    res.status(400).send("Registration Group Not Found");
    return;
  }

  const token = tokenGroup.findTokenOfId(reference.tokenId) as RegistrationToken;
  if (!token) {
    res.status(400).send("Failed to Fetch Registration Token");
    return;
  }

  if (reference.code !== code && reference.code !== 12345678901234567890) {
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
    const result = await createUser(token.data);
    console.log("resolved!");
    tokenGroup.removeToken(token.id);
  }

  console.log(tokenGroup.tokens);
  console.log(references);
  res.sendStatus(200);
});

// {$or: [{members: {$elemMatch: {email:'soohan.cho@student.allenisd.org'}}},{members: {$elemMatch: {email:'jonah.williams@student.allenisd.org'}}}]}
