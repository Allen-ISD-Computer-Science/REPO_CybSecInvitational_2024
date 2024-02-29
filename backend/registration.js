//@ts-check
require("dotenv").config();

const express = require("express");
const { createServer, get } = require("http");
const session = require("express-session");
const { Server } = require("socket.io");
const path = require("path");
const bodyParser = require("body-parser");

const config = require(path.join(__dirname, "config.json"));

const app = express();
const server = createServer(app);
const io = new Server(server);

//#region MongoDB
if (!process.env.MONGODB_USERNAME) throw Error("Process missing MongoDB Username");
if (!process.env.MONGODB_PASSWORD) throw Error("Process missing MongoDB Password");
if (!process.env.MAIN_DATABASE_NAME) throw Error("Missing main database name");
if (!process.env.USERS_COLLECTION) throw Error("Missing users collection name");
if (!process.env.PUZZLES_COLLECTION) throw Error("Missing puzzles collection name");
if (!process.env.BATTLE_ROUND_COLLECTION) throw Error("Missing battle round collection name");
if (!process.env.ADMINISTRATOR_COLLECTION) throw Error("Missing administrator collection name");

const mongo_username = encodeURIComponent(process.env.MONGODB_USERNAME);
const mongo_password = encodeURIComponent(process.env.MONGODB_PASSWORD);

const mainDbName = process.env.MAIN_DATABASE_NAME;
const usersColName = process.env.USERS_COLLECTION;
const puzzlesColName = process.env.PUZZLES_COLLECTION;
const battleRoundPuzzlesColName = process.env.BATTLE_ROUND_COLLECTION;
const adminColName = process.env.ADMINISTRATOR_COLLECTION;

const { MongoClient, ServerApiVersion } = require("mongodb");
const { generateKey, verify } = require("crypto");
const { cursorTo } = require("readline");
const uri = `mongodb+srv://${mongo_username}:${mongo_password}@cluster0.jn6o6ac.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Close connection when server stops
process.on("SIGINT", () => {
  client.close().then(() => {
    console.info("Mongoose primary connection disconnected through app termination!");
    process.exit(0);
  });
});
//#endregion

//middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
  session({
    //@ts-ignore
    secret:
      process.env.EXPRESS_SESSION_SECRET ||
      generateKey("hmac", { length: 256 }, (err, key) => {
        return key;
      }),
    resave: false, // don't save session if unmodified
    saveUninitialized: false, // don't create session until something stored
  })
);

app.use(express.static(path.join(__dirname, "public")));

const verifyUser = function (req, res, next) {
  if (!req.session.username) {
    res.redirect("login");
    return;
  }
  next();
};

app.get("/", function (req, res) {
  res.redirect("register");
});
//#endregion

app.get("/home", verifyUser, function (req, res) {
  res.sendFile(path.join(__dirname, "public/wait.html"));
});

async function fetchUser(username) {
  try {
    const result = await client.db(mainDbName).collection(usersColName).findOne({ username: username });
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

app.get("/login", function (req, res) {
  //@ts-ignore
  if (req.session.username) {
    res.redirect("home");
  }
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/logout", verifyUser, function (req, res) {
  req.session.destroy(function () {
    console.log("User logged out!");
  });
  res.redirect("login");
});

app.post("/login", async (req, res) => {
  console.log("attempting login ");

  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.sendStatus(400);
    return;
  }

  var user = await fetchUser(username);
  if (!user) {
    res.sendStatus(404);
    return;
  }

  if (user.password === password) {
    //@ts-ignore
    req.session.username = user.username;
    res.sendStatus(200);
    return;
  } else {
    console.log("invalid login credentials");
    res.sendStatus(401);
    return;
  }
});

//#region Registration
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "public/register.html"));
});

app.get("/confirm", (req, res) => {
  res.sendFile(path.join(__dirname, "public/confirm.html"));
});

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "info.ahscyber@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function genRandPassword() {
  return Math.random().toString(36).slice(-8);
}
function genRandHex(size) {
  return [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");
}

async function addUser(participants) {
  console.log(participants);
  try {
    const user = {
      division: 0,
      username: `${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}-${genRandHex(4)}`,
      password: genRandPassword(),
      completed_puzzles: {},
      members: participants,
      emails: [],
      puzzle_points: 0,
      scenario_points: 0,
    };

    for (let participant of participants) {
      user.emails.push(participant.email);
    }

    let result = await client.db(mainDbName).collection(usersColName).insertOne(user);
    if (result.acknowledged) {
      return user;
    }
    return null;
  } catch (err) {
    console.log(err);
    return null;
  }
}

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

async function sendVerificationEmail(email, code, registrant) {
  const message = {
    from: "ahsinvitational@gmail.com",
    to: [email],
    subject: "AHS Cyber Invitational - Email Verification Code",
    text: `An AHS Cyber Invitational account has attempted to be created using this email\nIf you have not attempted to create an AHS Cyber Invitational account using this email, please ignore this message\nYour verification code is: ${code}`,
    html: `
    <h1>AHS Cyber Invitational</h1>
    <p>An AHS Cyber Invitational account has attempted to be created using this email</p>
    <p>If you have not attempted to create an AHS Cyber Invitational account using this email, please ignore this message</p>
    <br />
    <p>Your verification code is: ${code}</p>
    `,
  };

  transporter.sendMail(message, (error, info) => {
    if (error) {
      console.error("Error sending email: ", error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });

  const devMessage = {
    from: "ahsinvitational@gmail.com",
    to: ["soohan.cho@student.allenisd.org", "david.benyaakov@allenisd.org", "james.dungan@student.allenisd.org"],
    subject: "AHS Cyber Invitational - Developer Verification Email",
    html: `
    <p>
    Registrant is verifying email<br />
    <br />
    Sent To: ${email}<br />
    Code: ${code}<br />
    FirstName: ${registrant.firstName}<br />
    LastName: ${registrant.lastName}<br />
    School: ${registrant.school}<br />
    GradeLevel: ${registrant.gradeLevel}<br />
    shirtSize: ${registrant.shirtSize}<br />
    GradeLevel: ${registrant.dietaryRestriction}<br />
    </p>
    `,
  };

  transporter.sendMail(devMessage, (error, info) => {
    if (error) {
      console.error("Error sending dev email: ", error);
    } else {
      console.log("Dev Email sent: ", info.response);
    }
  });
}
function sendConfirmationEmail(email, username, password, registrant) {
  const message = {
    from: "ahsinvitational@gmail.com",
    to: [email],
    subject: "AHS Cyber Invitational - Account Created",
    text: `An AHS Cyber Invitational account has created under this email\nIf you have not created an AHS Cyber Invitational account using this email, please ignore this message\nUsername: ${username}\nPassword: ${password}`,
    html: `
    <h1>AHS Cyber Invitational</h1>
    <p>An AHS Cyber Invitational account has created under this email</p>
    <p>If you have not created an AHS Cyber Invitational account using this email, please ignore this message</p>
    <br />
    <p>Username: ${username}</p>
    <p>Password: ${password}</p>
    `,
  };

  transporter.sendMail(message, (error, info) => {
    if (error) {
      console.error("Error sending email: ", error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });

  const devMessage = {
    from: "ahsinvitational@gmail.com",
    to: ["soohan.cho@student.allenisd.org", "david.benyaakov@allenisd.org", "james.dungan@student.allenisd.org"],
    subject: "AHS Cyber Invitational - Developer Confirmation Email",
    html: `
      <p>
      Registrant's account is made, confirmation information<br />
      <br />
      Sent To: ${email}<br />
      Username: ${username}<br />
      Password: ${password}<br />
      FirstName: ${registrant.firstName}<br />
      LastName: ${registrant.lastName}<br />
      School: ${registrant.school}<br />
      GradeLevel: ${registrant.gradeLevel}<br />
      shirtSize: ${registrant.shirtSize}<br />
      GradeLevel: ${registrant.dietaryRestriction}<br />
      </p>
      `,
  };
  transporter.sendMail(devMessage, (error, info) => {
    if (error) {
      console.error("Error sending dev email: ", error);
    } else {
      console.log("Dev Email sent: ", info.response);
    }
  });
}

/**
 * @typedef {object} Registrant
 * @param {string} email
 * @param {string} firstName
 * @param {string} lastName
 * @param {string} school
 * @param {string} gradeLevel
 * @param {string} firstName
 */

class VerificationGroup {
  static pendingGroups = {};

  static attemptVerification(email, code) {
    let group = VerificationGroup.pendingGroups[email];
    if (!group) return false;
    return group.attemptValidation(email, code);
  }

  constructor(registrants) {
    this.tokens = {};
    for (let registrant of registrants) {
      if (!validateEmail(registrant.email)) throw "Invalid Email Format!";
      if (VerificationGroup.pendingGroups[registrant.email]) throw "Email Already Pending Verification!";

      let token = new VerificationToken(registrant);
      if (token) this.tokens[registrant.email] = token;
      sendVerificationEmail(registrant.email, token.code, registrant);
      VerificationGroup.pendingGroups[registrant.email] = this;
    }

    this._timeout = setTimeout(() => {
      console.log("session ended");
      this.remove();
    }, 300000);
  }

  remove() {
    clearTimeout(this._timeout);
    for (const key of Object.keys(this.tokens)) {
      delete VerificationGroup.pendingGroups[key];
    }
  }

  async onGroupResolved() {
    console.log("resolved group verification");

    let participants = Object.values(this.tokens).map((value) => {
      delete value.verified;
      delete value.code;
      return value;
    });
    addUser(participants).then((result) => {
      console.log("added user successfully!", result);
      if (!result || !result.members) return;
      for (let member of result.members) {
        sendConfirmationEmail(member.email, result.username, result.password, member);
      }
    });

    this.remove();
    console.log(VerificationGroup.pendingGroups);
  }

  attemptValidation(email, code) {
    let token = this.tokens[email];
    if (!token) return false;
    if (token.code !== code) return false;
    token.verified = true;

    let resolved = true;
    for (const [key, token] of Object.entries(this.tokens)) {
      if (!token.verified) {
        resolved = false;
        break;
      }
    }
    if (resolved) {
      this.onGroupResolved();
    }
    return true;
  }
}

class VerificationToken {
  constructor(registrant) {
    this.email = registrant.email;
    this.firstName = registrant.firstName;
    this.lastName = registrant.lastName;
    this.school = registrant.school;
    this.gradeLevel = registrant.gradeLevel;
    this.shirtSize = registrant.shirtSize;
    this.dietaryRestriction = registrant.dietaryRestriction;
    this.code = Math.floor(100000 + Math.random() * 900000);
    this.verified = false;
  }
}

app.post("/registerVerify", (req, res) => {
  const email = String(req.body.email);
  const code = Number(req.body.code);

  if (!email || !code) {
    res.sendStatus(400);
    return;
  }

  const result = VerificationGroup.attemptVerification(email, code);
  if (result) {
    res.sendStatus(200);
    return;
  } else {
    res.sendStatus(404);
    return;
  }
});
let allowedDomains = [/@lovejoyisd.com\s*$/, /@student.mckinneyisd.net\s*$/, /@wylieisd.net\s*$/, /@mypisd.net\s*$/, /@student.allenisd.org\s*$/, /@friscoisd.org\s*$/, /@prosper-isd.net\s*$/];
function checkEmailDomain(email) {
  for (let regexDomain of allowedDomains) {
    console.log(regexDomain);
    if (regexDomain.test(email)) {
      console.log("matches");
      return true;
    }
  }
  return false;
}

app.post("/register", async (req, res) => {
  /**@type {Registrant[]} */
  let registrants = [];
  const registrantsBody = req.body.registrants;
  try {
    if (registrantsBody.length > 2) {
      //limit group size
      res.sendStatus(400);
      return;
    }

    for (let registrant of registrantsBody) {
      console.log(registrant);

      const email = String(registrant.email);
      const firstName = String(registrant.firstName);
      const lastName = String(registrant.lastName);
      const school = String(registrant.school);
      const gradeLevel = String(registrant.gradeLevel);
      const shirtSize = String(registrant.shirtSize);
      const dietRestriction = String(registrant.dietaryRestriction);
      if (!email || !firstName || !lastName || !school || !gradeLevel || !shirtSize || !dietRestriction) {
        res.status(400).send("Missing Parameters!");
        return;
      }

      if (!validateEmail(email)) {
        res.status(400).send("Invalid Email Format!");
        return;
      }

      if (!checkEmailDomain(email)) {
        res.status(400).send("Invalid Email Domain!");
        return;
      }

      registrants.push({
        email: email,
        firstName: firstName,
        lastName: lastName,
        school: school,
        gradeLevel: gradeLevel,
        shirtSize: shirtSize,
        dietaryRestriction: dietRestriction,
      });
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
    return;
  }

  let emails = registrants.map((registrant) => {
    return { emails: registrant.email };
  });

  try {
    let result = await client.db(mainDbName).collection(usersColName).findOne({ $or: emails });
    if (result) {
      res.status(400).send("Account with Email already exists!");
      return;
    }
  } catch (err) {
    res.status(500).send("Server Side Error!");
    return;
  }

  try {
    await new VerificationGroup(registrants);
    res.sendStatus(200);
    return;
  } catch (err) {
    console.log(err);
    res.status(400).send(err);
    return;
  }
});
//#endregion

server.listen(Number(config.host_port), function () {
  //@ts-ignore
  var host = server.address().address;
  //@ts-ignore
  var port = server.address().port;

  console.log(server.address());

  console.log("server at http://localhost:%s", port);
});
