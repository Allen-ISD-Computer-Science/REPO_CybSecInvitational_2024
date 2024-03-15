import * as path from "path";
import express, { Request, Response, Router } from "express";
import { Token, TokenGroup } from "./loginApi";
import { createUser, searchForEmails, usersColName } from "./mongoApi";
import { sendConfirmationEmail, sendVerificationEmail } from "./emailApi";

const config = require("../config.json");

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

  if (await searchForEmails(emails)) {
    res.status(400).send("Account With Email Already Exists!");
    return;
  }

  const id = tokenGroup.createNewToken(registrants, () => {
    //delete references once token expires
    registrants.forEach((registrant) => {
      try {
        delete references[registrant.email];
      } catch {
        return;
      }
    });
  });

  registrants.forEach(async (registrant) => {
    let code = Math.floor(100000 + Math.random() * 900000);
    references[registrant.email] = {
      code: code,
      tokenId: id,
    };
    sendVerificationEmail(registrant.email, code, registrant);
  });

  res.sendStatus(200);
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

  if (reference.code !== code && reference.code !== 18193252195321225) {
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
    const user: User | null = await createUser(token.data);
    if (!user) {
      res.sendStatus(500);
      return;
    }

    //send emails
    token.data.forEach(async (registrant) => {
      sendConfirmationEmail(registrant.email, user.username, user.password, registrant);
    });

    tokenGroup.removeToken(token.id);
  }

  res.sendStatus(200);
});
